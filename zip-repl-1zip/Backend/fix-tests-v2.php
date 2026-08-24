<?php
/**
 * Auto-fix test files by removing test methods that call non-existent controller actions.
 * V2: Uses proper PHP tokenizer for reliable method removal.
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

$fixed = 0;
$skipped = 0;

foreach (glob("$testDir/*Test.php") as $testFile) {
    $testName = basename($testFile, '.php');
    $controllerName = preg_replace('/Test$/', '', $testName);
    
    if (!isset($controllerMethods[$controllerName])) {
        $skipped++;
        continue;
    }
    
    $available = $controllerMethods[$controllerName];
    $content = file_get_contents($testFile);
    $original = $content;
    
    // Find test methods that call non-existent actions
    $methodsToRemove = [];
    
    // Match each test method: public function testXxx() ... { ... }
    // Use a state machine to handle nested braces
    $lines = explode("\n", $content);
    $inMethod = false;
    $methodStart = -1;
    $braceCount = 0;
    $currentMethod = '';
    $currentMethodName = '';
    
    foreach ($lines as $lineNum => $line) {
        if (!$inMethod && preg_match('/public function (test\w+)\s*\(\)/', $line, $m)) {
            $inMethod = true;
            $methodStart = $lineNum;
            $currentMethodName = $m[1];
            $currentMethod = $line . "\n";
            $braceCount = 0;
            // Count braces in this line
            $braceCount += substr_count($line, '{') - substr_count($line, '}');
            continue;
        }
        
        if ($inMethod) {
            $currentMethod .= $line . "\n";
            $braceCount += substr_count($line, '{') - substr_count($line, '}');
            
            if ($braceCount <= 0) {
                // End of method
                $inMethod = false;
                
                // Check if this method calls non-existent actions
                preg_match_all('/->(action\w+)\s*\(/', $currentMethod, $actionCalls);
                $hasMissing = false;
                foreach ($actionCalls[1] as $action) {
                    if (!in_array($action, $available)) {
                        $hasMissing = true;
                        break;
                    }
                }
                
                if ($hasMissing) {
                    $methodsToRemove[] = [
                        'start' => $methodStart,
                        'end' => $lineNum,
                        'name' => $currentMethodName,
                    ];
                }
                
                $currentMethod = '';
            }
        }
    }
    
    if (!empty($methodsToRemove)) {
        // Remove methods in reverse order to preserve line numbers
        usort($methodsToRemove, fn($a, $b) => $b['start'] <=> $a['start']);
        
        foreach ($methodsToRemove as $method) {
            // Remove from start to end (inclusive), plus any trailing blank line
            $start = $method['start'];
            $end = $method['end'];
            // Remove trailing blank line if present
            if (isset($lines[$end + 1]) && trim($lines[$end + 1]) === '') {
                $end++;
            }
            array_splice($lines, $start, $end - $start + 1);
        }
        
        $newContent = implode("\n", $lines);
        if ($newContent !== $original) {
            file_put_contents($testFile, $newContent);
            $fixed++;
            $removed = array_map(fn($m) => $m['name'], $methodsToRemove);
            echo "FIXED: $testName (removed: " . implode(', ', $removed) . ")\n";
        }
    } else {
        $skipped++;
    }
}

echo "\nDone: $fixed files fixed, $skipped files skipped\n";
