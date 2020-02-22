<?php

require('get-param.php');
require('enableCORS.php');

if (getParam('roomid')) {
    $filename = getcwd().'/rooms/'.getParam('roomid').'.json';
    
    if (file_exists($filename)) {
        echo json_encode(array(
            'isRoomExist' => true,
            'roomid' => getParam('roomid')
        ));
    } else {
        echo json_encode(array(
            'isRoomExist' => false,
            'roomid' => getParam('roomid')
        ));
    }
}
?>
