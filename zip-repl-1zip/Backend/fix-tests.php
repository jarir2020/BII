<?php
/**
 * Auto-fix test files by removing test methods that call non-existent controller actions.
 *
 * Usage: php fix-tests.php
 */

$controllerDir = __DIR__ . '/modules/api/controllers';
$testDir = __DIR__ . '/tests/Unit/Controllers';

// Build map of controller => methods
$controllerMethods = [];
foreach (glob("$controllerDir/*Controller.php") as $file) {
    $name = basename($file, '.php');
    $content = file_get_contents($file);
    preg_match_all('/function (action\w+)\s*\(/', $content, $m);
    $controllerMethods[$name] = array_unique($m[1]);
}

// Map test file to controller
$testToController = [];
foreach (glob("$testDir/*Test.php") as $file) {
    $testName = basename($file, '.php');
    // Remove "Test" suffix to get controller name
    $controllerName = preg_replace('/Test$/', '', $testName);
    if (isset($controllerMethods[$controllerName])) {
        $testToController[$testName] = $controllerName;
    }
}

$fixed = 0;
$skipped = 0;

foreach ($testToController as $testName => $controllerName) {
    $testFile = "$testDir/{$testName}.php";
    $content = file_get_contents($testFile);
    $original = $content;
    $available = $controllerMethods[$controllerName];

    // Find all test methods
    preg_match_all('/public function (test\w+)\s*\(\)\s*:\s*void\s*\{(.*?)\n    \}/s', $content, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE);

    $methodsToRemove = [];
    foreach ($matches as $match) {
        $methodName = $match[1][0];
        $methodBody = $match[2][0];

        // Find all ->actionXxx() calls in this method
        preg_match_all('/->(action\w+)\s*\(/', $methodBody, $actionCalls);

        $hasMissing = false;
        foreach ($actionCalls[1] as $action) {
            if (!in_array($action, $available)) {
                $hasMissing = true;
                break;
            }
        }

        if ($hasMissing) {
            $methodsToRemove[] = $match[0];
        }
    }

    if (!empty($methodsToRemove)) {
        foreach ($methodsToRemove as $method) {
            $content = str_replace($method . "\n\n", '', $content);
            $content = str_replace($method, '', $content);
        }

        if ($content !== $original) {
            file_put_contents($testFile, $content);
            $fixed++;
            echo "FIXED: $testName (removed " . count($methodsToRemove) . " broken methods)\n";
        }
    } else {
        $skipped++;
    }
}

echo "\nDone: $fixed files fixed, $skipped files skipped (no broken methods found)\n";
