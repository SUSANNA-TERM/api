<?php
define("hostname", "blockchain.athenarc.gr");
define("port", 8888);
define("key", "*****");

function rest_call($method, $command, $data = false)
{
    $url = 'https://'.hostname.':'.port.'/api/'.$command;
    $curl = curl_init();


    curl_setopt($curl, CURLOPT_HTTPHEADER, array(
        'authorization: '.key,
        'Content-Type: application/json'
    ));
    

    switch ($method)
    {
        case "POST":
            curl_setopt($curl, CURLOPT_POST, 1);
            if ($data)
              curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
        
            break;
        case "PUT":
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'PUT');
            if ($data)
              curl_setopt($curl, CURLOPT_POSTFIELDS, $data);            
            break;
        default:
            if ($data)
                $url = sprintf("%s?%s", $url, http_build_query($data));
    }

    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);

    curl_setopt($curl, CURLOPT_CAINFO, getcwd().'/cert.pem');
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, TRUE);
    curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, FALSE);
   

    $result = curl_exec($curl);

    curl_close($curl);
    if ($result === FALSE)
    	return false;
    else
    	return json_decode($result);

}



?>
