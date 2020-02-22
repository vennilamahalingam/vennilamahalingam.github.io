//using google stun server.
var sseDirPath = "https://vennila.boyal.us:20443/modules/webRTC/muah-khan_sse-signaling/SSEConnection";
var id = "";
const constraints = {audio: true, video: true};
var skipDuplicate ={};
var socket ="";
var identity = "callee";
var peerconnection = "";
var global_offer = "";
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};
var candidate_data = [];
var target_id = "";
var candidate_added = false;
var isconnect = true;

function setup_rtc(user_id, target_id)
{
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    window.PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    window.IceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
    window.SessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
	
	peerconnection = new PeerConnection({
	  iceServers: [
		{
		  urls: "stun:stun.l.google.com:19302"
		}
	  ]
	});	
	peerconnection.onicecandidate = function(ice)
	{
		 if(ice.candidate && ice.candidate != null)
		 {
		
			candidate_data.push(ice.candidate);
			//emit(data, target_id);
		 }
	};
		
	peerconnection.ontrack = function(event) {
	  document.getElementById("received_video").srcObject = event.streams[0];
	  document.getElementById("waiting_msg").style.display = "none";
	  document.getElementById("hang_up").style.display = "block";
	};
}
function login_room()
{
	user_id = document.getElementsByClassName("input_area")[0].value;
	connect_socket(user_id);
	document.getElementById("show_on_login").style.display = "block";
	document.getElementById("login_section").style.display = "none";
}
function open_room()
{
	target_id = document.getElementsByClassName("input_area_user")[0].value;
	setup_rtc(user_id, target_id);
	enable_self_video(
		function()
		{
			identity = "caller";
			var data = {};
			data.prop = "callrequest";
			data.target_id = target_id;
			data.user_id = user_id;
			emit(data, target_id);
			document.getElementById("waiting_msg").append("Waiting for "+target_id+" to come online...");
			document.getElementById("show_on_login").style.display = "none";
			peerconnection.onnegotiationneeded  = function()
			{
				peerconnection.createOffer(offerOptions).then(function(offer) {
				  global_offer = offer;
				})
				.then(function(){
					//emit(JSON.stringify(peerconnection.localDescription), id);
				});
				
			}
			console.log("creating request to "+target_id);
		}
	)
}
async function enable_self_video(callback)
{
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
	stream.getTracks().forEach((track) =>
					  peerconnection.addTrack(track, stream));
    document.getElementById('source_video').srcObject = stream;
	callback();
}

function emit(data, userId)
{
	var hr = new XMLHttpRequest();
	hr.open('POST', sseDirPath + '/publish.php');
	var type = data.prop;
	
	var formData = new FormData();
	formData.append('data', JSON.stringify(data));
	formData.append('sender', userId);
	formData.append('type', type);
	
	hr.send(formData);
	console.log("adding "+type);
}

function connect_socket(id)
{
	socket = new EventSource(sseDirPath+'/SSE.php?me='+id);
	var initiated = false;
	socket.onopen = function(event)
	{	
	}
	socket.onmessage = function(event)
	{
		if(peerconnection.localDescription && peerconnection.remoteDescription && !candidate_added && candidate_data.length >0)
		{
			var data = {};
			data.prop = "candidate";
			data.candidate_information = candidate_data;
			data.target_id = target_id;
			
			emit(data, target_id);			
			candidate_added = true;
		}
		if(event.data != "null")
		{
			if(skipDuplicate[event.data])
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
	var json = JSON.parse(event.data);
	
	if(json["candidate"] != undefined)
	{
		console.log(JSON.parse(json["candidate"]));
		var candidate_arr = JSON.parse(json["candidate"]).candidate_information;
		//var cand_info = JSON.parse(json["candidate"]).candidate_information;
		for(var i=0; i<candidate_arr.length; i++)
		{
			peerconnection.addIceCandidate(candidate_arr[i]);			
		}
	}
	else if(json["sdp"] != undefined)
	{
		var desc = JSON.parse(json["sdp"]).localDescription.type;
		if(desc == "offer")
		{
			var caller = JSON.parse(json["sdp"]).user_id;
			
			console.log("sdp received");
			await peerconnection.setRemoteDescription((JSON.parse(json["sdp"])).localDescription);
			peerconnection.createAnswer(offerOptions).then(function(result){
				var data = {};
				data.localDescription = result;
				data.prop = "sdp";
				data.user_id = user_id;
				emit(data, caller);
				peerconnection.setLocalDescription(result, function(){}, function(){});
				});			
		}
		else if(desc == "answer")
		{
			var callee = JSON.parse(json["sdp"]).user_id;
			
			await peerconnection.setRemoteDescription(JSON.parse(json["sdp"]).localDescription);
		}
	}
	else if(json["callrequest"] != undefined)
	{
		var caller = JSON.parse(json["callrequest"]).user_id;
		document.getElementById("show_on_login").style.display = "none";
		document.getElementById("connection_awaiting").style.display = "block";
		document.getElementById("connecting_msg").append(""+caller+" requests to connect..");
		if(isconnect)
		{		
            document.getElementById("connection_awaiting").style.display = "none";	
			target_id = caller;
			
			setup_rtc(user_id, caller);
			enable_self_video(
				function()
				{
					identity = "callee";
					var data = {};
					data.prop = "callaccepted";
					data.target_id = caller;
					data.user_id = user_id;
					emit(data, caller);
					console.log("sending acceptance");
				}
			)
		}
		
	}
	else if(json["callaccepted"] != undefined)
	{
		var callee = JSON.parse(json["callaccepted"]).user_id;
		console.log("call accepted "+callee);
		var data = {};
		data.prop = "sdp";
		data.target_id = callee;
		data.user_id = user_id;
		data.localDescription = global_offer;
		emit(data, callee);
		await peerconnection.setLocalDescription(global_offer, function(){}, function(){});
		 
	}
	
}
function end_room()
{
	peerconnection.close();
}
function connect()
{
	skipDuplicate="";
	isconnect = true;
}