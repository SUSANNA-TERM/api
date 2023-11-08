<?php

require_once './api.php';

// POST Example (Change meter_id if you get an error "chaincode response 500, The asset meters with id ... already exists")

$postdata = '{"meter_id":3,"id":"string2","type":"string","metertype_id":0,"type_id":0,"mote":"string","barcode":"string","consumer":"string","provision":"string","lat":"string","lng":"string","address":"string","description":"string","location_id":0,"address_name":"string"}';
$command = 'Meters';

$call = rest_call("POST", $command, $postdata);
if ($call) {
	print_r($call);
	if ($call->success)
		echo 'Success';
	}
else
	echo 'Request failed!';


echo '<br><br>';

// GET Example ( Meters/{id} )

$command = 'Meters/0';

$call = rest_call("GET", $command);
if ($call) {
	print_r($call);
	if ($call->success)
		echo 'Success';
	}
else
	echo 'Request failed!';

?>
