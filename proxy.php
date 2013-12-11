<?php

if (isset($_GET['contains'])) {
    $lines = file($_GET['url']);
    
    foreach ($lines as $line_num => $line) {
        if (strpos($line, $_GET['contains'])!==false) {
            echo $line;
        }
    }
} else {
    echo file_get_contents($_GET['url']);
}
?>

