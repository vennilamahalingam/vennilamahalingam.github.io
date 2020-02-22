<?php

// "sender" stands for "Sender User Unique ID"
// "receiver" stands for "Receiver User Unique ID"
function writeJSON($json, $sender, $type)
{
    $path = './rooms/' . $sender . '.json';
	
    $content = file_get_contents($path);
	$content = json_decode($content, true);
	$newdata->$type = $json;
	$content[$type] = $json;
	
	

	$handle = fopen($path, 'w');
	$fwrite = fwrite($handle, json_encode($newdata));
		
    
    fclose($handle);
    
    return $content;
}

// this method resets the JSON
// to make sure that we do NOT send duplicate/similar data to the client (browser)
function removeJSON()
{
  
}
?>
