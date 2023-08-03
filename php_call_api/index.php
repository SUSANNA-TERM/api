<?php
require_once './api.php';

//$postdata = array("command"=>'write', "data1"=>37, "data2"=>43);
//$command = '';

$postdata = array("command"=>'read');
$command = '';

if (call_api($command, $postdata)) {
	print_r(call_api($command, $postdata));
	if (call_api($command, $postdata)->success)
		echo 'success ';
	}
else
	echo 'Request failed!';
	
//////// OR


//$postdata = array("data1"=>37, "data2"=>43);
//$command = 'write';

$postdata = '';
$command = 'read';

if (call_api($command, $postdata)) {
	print_r(call_api($command, $postdata));
	if (call_api($command, $postdata)->success)
		echo 'success ';
	}
else
	echo 'Request failed!';

/////// OR (when there are not parameters)

if (call_api($command)) {
	print_r(call_api($command));
	if (call_api($command)->success)
		echo 'success ';
	}
else
	echo 'Request failed!';



?>
