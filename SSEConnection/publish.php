<?php

require('write-json.php');
require('get-param.php');
require('enableCORS.php');

if (getParam('data') && getParam('sender') && getParam('type')) {
    $response = writeJSON(getParam('data'), getParam('sender'), getParam('type'));
    
    if ($response != true) {
        echo json_encode($response);
    }
    
    echo json_encode($response);
    exit();
}
?>
