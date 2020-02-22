<?php
$json = file_get_contents("./rooms/v.json");
$json = json_decode($json, true);

$content = $json;
$json["candidate1"] = "somedata";
echo json_encode($json);
?>
<body>
</body>