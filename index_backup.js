//using google stun server.
var sseDirPath = "https://vennila.boyal.us:20443/modules/webRTC/muah-khan_sse-signaling/SSEConnection";
var id = "";
const constraints = {audio: true, video: true};
var skipDuplicate ={};
var socket ="";
var created = false;

var peerconnection = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
});	



peerconnection.onnegotiationneeded  = function()
{
	peerconnection.createOffer().then(function(offer) {
	  return peerconnection.setLocalDescription(offer);
	})
	.then(function(){
		emit(JSON.stringify(peerconnection.localDescription), id);
	});
	
}

peerconnection.onicecandidate = function iceCallback(ice)
{
	 if(ice.candidate)
	 {
	    emit(JSON.stringify(ice.candidate), id, true);
	 }
};


peerconnection.onaddstream = function(event){
  if (document.getElementById('received_video').srcObject) return;
  document.getElementById('received_video').srcObject = event.stream;
};
async function open_room()
{
	id = document.getElementsByClassName("input_area")[0].value;
	check_presence(id, function(isRoomExist){
		if(!isRoomExist)
		{
			created = true;
		}
		connect_socket(id,async function(){
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			stream.getTracks().forEach((track) =>
					  peerconnection.addTrack(track, stream));
					  document.getElementById('source_video').srcObject = stream;
			
				});
	});
}

function emit(data, userId, isCandidate)
{
	var hr = new XMLHttpRequest();
	hr.open('POST', sseDirPath + '/publish.php');
	
	var formData = new FormData();
	formData.append('data', data);
	formData.append('sender', userId);
	if(isCandidate != undefined)
	{
		formData.append('type', "candidate");
	}
	else
	{
		formData.append('type', "sdp");
	}
	hr.send(formData);
}
function check_presence(roomid, callback)
{
	 var hr = new XMLHttpRequest();
    hr.responseType = 'json';
    hr.response = {
        isRoomExist: false
    };
    hr.addEventListener('load', function() 
	{
        console.info('XMLHttpRequest', hr.response);
		callback(hr.response.isRoomExist, roomid);
    });
    hr.addEventListener('error', function() {
        //callback(hr.response.isRoomExist, roomid);
    });
    hr.open('GET', sseDirPath + '/checkPresence.php?roomid=' + roomid);
    hr.send();
}




//create offer creates the SDP data that can be sent over to the peer for identification




function connect_socket(id, callback)
{
	socket = new EventSource(sseDirPath+'/SSE.php?me='+id);
	var initiated = false;
	socket.onopen = function(event)
	{
		if(!initiated)
		{
			callback();
			initiated = true;
		}
	}
	socket.onmessage = function(event)
	{
		if(event.data != "null")
		{
			if(skipDuplicate[event.data] || created)
			{
				return;
			}
			skipDuplicate[event.data] = true;
			console.log(event);
			onmessage_callback(event.data);		
		}
	}
}
async function onmessage_callback(json_data)
{
	json_data = JSON.parse(json_data);
	json_data.sdp = json_data.sdp ? JSON.parse(json_data.sdp) : "";
	json_data.candidate = json_data.candidate ? JSON.parse(json_data.candidate) : "";

	if(json_data.sdp.type == "offer")
	{
		peerconnection.setRemoteDescription(json_data.sdp);
        const stream =
          await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach((track) =>
          peerconnection.addTrack(track, stream));
		  peerconnection.createAnswer(function(result){
			console.log(result);
			emit(JSON.stringify(result), id);
			peerconnection.setLocalDescription(result, function(){}, function(){});
			}, function(){});
	}
	else if(json_data.sdp.type == "answer")
	{
		await peerconnection.setRemoteDescription(json_data.sdp);
	}
	if(json_data.candidate != '')
	{
		peerconnection.addIceCandidate(json_data.candidate);
	}
}
function close_room()
{
	socket.close();
}