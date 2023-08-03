<?php
define("hostname", "localhost");
define("port", 8080);
define("key", "12345");


function call_api($command, $postdata = array()) {
if ($postdata == '' || $postdata == null)
	$postdata = array();

$url = 'https://'.hostname.':'.port.'/api/'.$command;
$ContextOptions= [
    'ssl' => [
        'cafile' => './cert.pem',
        'verify_peer'=> true,
        'verify_peer_name'=> true,
    ],
	'http' => [
	'ignore_errors' => true,
	'method'  => 'POST',
	'header'  => "Content-type: application/json\r\nauthorization: ".key,
	'content' => json_encode($postdata)
	]
];

$response = @file_get_contents($url,false,stream_context_create($ContextOptions));
if ($response === FALSE)
	return false;
else
	return json_decode($response);
}



?>