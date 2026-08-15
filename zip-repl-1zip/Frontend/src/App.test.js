/**
 * Unit tests for the /admin/product → /admin/products route fix.
 *
 * Since react-router v7 has ESM/CJS compatibility issues with Jest in this
 * CRA/CRACO setup, we verify the route fix at the source-code level:
 *   1. App.js contains a <Route path="product"> that redirects to /admin/products
 *   2. App.js contains a <Route path="products"> for the actual Products page
 *   3. The backend ProductController alias exists and extends ProductsController
 *   4. The .htaccess has SPA rewrite rules
 */

const fs = require("fs");
const path = require("path");

const FRONTEND_SRC = path.resolve(__dirname);
const BACKEND_SRC = path.resolve(
  __dirname,
  "../../Backend/modules/api/controllers"
);
const PUBLIC_HTML = path.resolve(__dirname, "../../..");

describe("Route fix: /admin/product not found", () => {
  let appJs;

  beforeAll(() => {
    appJs = fs.readFileSync(path.join(FRONTEND_SRC, "App.js"), "utf8");
  });

  test("App.js defines a /admin/product route (singular) with Navigate redirect", () => {
    // Should have a route for "product" that redirects to /admin/products
    expect(appJs).toMatch(
      /path=["']product["']\s+element=\{<Navigate\s+to=["']\/admin\/products["']/
    );
  });

  test("App.js defines the /admin/products route (plural) with AdminProducts", () => {
    // Should have the existing route for "products"
    expect(appJs).toMatch(
      /path=["']products["']\s+element=\{<AdminProducts\s*\/?>/
    );
  });

  test("AdminProducts component is imported from CrudPages", () => {
    expect(appJs).toMatch(
      /AdminProducts\s*=\s*lazy\(\(\)\s*=>\s*import\(["']@\/pages\/admin\/CrudPages["']\)/
    );
  });

  test("Navigate is imported from react-router-dom", () => {
    expect(appJs).toMatch(/Navigate.*from\s+["']react-router-dom["']/);
  });
});

describe("Backend: ProductController alias exists", () => {
  const controllerPath = path.join(BACKEND_SRC, "ProductController.php");

  test("ProductController.php exists", () => {
    expect(fs.existsSync(controllerPath)).toBe(true);
  });

  test("ProductController extends ProductsController", () => {
    const content = fs.readFileSync(controllerPath, "utf8");
    expect(content).toMatch(/class\s+ProductController\s+extends\s+ProductsController/);
  });

  test("ProductController is in the correct namespace", () => {
    const content = fs.readFileSync(controllerPath, "utf8");
    expect(content).toMatch(
      /namespace\s+app\\modules\\api\\controllers/
    );
  });
});

describe("Frontend: .htaccess has SPA rewrite rules", () => {
  const htaccessPath = path.join(PUBLIC_HTML, ".htaccess");

  test(".htaccess exists at public_html root", () => {
    expect(fs.existsSync(htaccessPath)).toBe(true);
  });

  test(".htaccess has SPA fallback rewrite rule", () => {
    const content = fs.readFileSync(htaccessPath, "utf8");
    // Should serve index.html for non-file, non-API routes
    expect(content).toMatch(/RewriteRule\s+\^\s+index\.html\s+\[L\]/);
  });

  test(".htaccess routes /api/* to index.php (Yii backend)", () => {
    const content = fs.readFileSync(htaccessPath, "utf8");
    expect(content).toMatch(/RewriteRule\s+\^api/);
  });

  test(".htaccess serves real files directly (skip rewrite)", () => {
    const content = fs.readFileSync(htaccessPath, "utf8");
    expect(content).toMatch(/REQUEST_FILENAME.*-f/);
  });

  test(".htaccess passes Authorization header for JWT auth", () => {
    const content = fs.readFileSync(htaccessPath, "utf8");
    expect(content).toMatch(/HTTP_AUTHORIZATION/);
  });
});
