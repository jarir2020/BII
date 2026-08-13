import { useEffect } from "react";

function setMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null || value === "") el.removeAttribute(key);
    else el.setAttribute(key, value);
  });
}

function setLink(rel, attrs) {
  const selector = `link[rel="${rel}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null || value === "") el.removeAttribute(key);
    else el.setAttribute(key, value);
  });
}

export default function Seo({
  title,
  description,
  keywords,
  canonical,
  image,
  noindex = false,
  lang = "bn",
  structuredData,
}) {
  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const scriptId = "bii-jsonld";
    const existingScript = document.getElementById(scriptId);

    if (title) document.title = title;
    document.documentElement.lang = lang;

    if (description) {
      setMeta('meta[name="description"]', { name: "description", content: description });
      setMeta('meta[property="og:description"]', { property: "og:description", content: description });
      setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    }

    if (keywords) {
      setMeta('meta[name="keywords"]', { name: "keywords", content: keywords });
    }

    setMeta('meta[property="og:title"]', { property: "og:title", content: title || previousTitle });
    setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title || previousTitle });
    setMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    setMeta('meta[property="og:locale"]', { property: "og:locale", content: lang === "bn" ? "bn_BD" : "en_US" });
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonical || window.location.href });

    if (image) {
      setMeta('meta[property="og:image"]', { property: "og:image", content: image });
      setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
      setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    } else {
      setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
    }

    setMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex ? "noindex, nofollow" : "index, follow",
    });

    if (canonical) {
      setLink("canonical", { href: canonical });
    }

    if (structuredData) {
      const nextScript = document.createElement("script");
      nextScript.type = "application/ld+json";
      nextScript.id = scriptId;
      nextScript.text = JSON.stringify(structuredData);
      if (existingScript) existingScript.replaceWith(nextScript);
      else document.head.appendChild(nextScript);
    } else if (existingScript) {
      existingScript.remove();
    }

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
    };
  }, [title, description, keywords, canonical, image, noindex, lang, structuredData]);

  return null;
}
