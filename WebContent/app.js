// Khởi tạo kết nối WebSocket tới địa chỉ server
const socket = new WebSocket("http://192.168.1.14:8080/TestWebRTC/chat");
console.log("oke")
let localStream ;
let screenStream;
let peerConnections = {};
let currentParticipantId = null;

// Danh sách người tham gia
let participants = [];
// Xử lý khi kết nối được mở
socket.onopen = function() {
    console.log("WebSocket is connected.");
};

// Xử lý khi có tin nhắn từ server
/*socket.onmessage = function(event) {
    const chatWindow = document.getElementById("chatWindow");
    const message = event.data;
    // Thêm tin nhắn vào khung chat
    chatWindow.innerHTML += "<p>" + message + "</p>";
    // Tự động cuộn xuống khi có tin nhắn mới
    chatWindow.scrollTop = chatWindow.scrollHeight;
};*/
socket.onmessage = function(event) {
    const data = JSON.parse(event.data);

    if (data.type === "newParticipant") {
		//console.log("Message received: ", event.data);
        // Thêm thành viên mới vào danh sách
        addParticipant(data.id, data.name);
    } else if (data.type === "participantLeft") {
		//console.log("Message received: ", event.data);
        // Xóa thành viên khỏi danh sách khi họ rời đi
        removeParticipant(data.id);
    } else if (data.type === "message") {
		//console.log("Message received: ", event.data);
        // Hiển thị tin nhắn trong khung chat
        displayMessage(data.sender, data.message);
    } else {
        console.log("Message received: ", event.data);
    }
};



// Xử lý khi WebSocket đóng
socket.onclose = function(event) {
    console.log("WebSocket is closed.");
};

// Xử lý lỗi WebSocket
socket.onerror = function(error) {
    console.log("WebSocket error: ", error);
};
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message !== "") {
        // Gửi tin nhắn qua WebSocket
        socket.send( message);
        
        // Hiển thị tin nhắn của chính mình trong khung chat
        //displayMessage("Me", message);
        
        // Xóa nội dung trong ô nhập liệu
        messageInput.value = "";
    }
}

// Hàm hiển thị tin nhắn trong khung chat
function displayMessage(sender, message) {
    const chatWindow = document.getElementById('chatWindow');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;  // Cuộn xuống dưới cùng để xem tin nhắn mới nhất
}
// Chọn người tham gia để hiển thị video
function selectParticipant(id) {
    const selectedPeerConnection = peerConnections[id];
    if (selectedPeerConnection) {
        const mainVideo = document.getElementById('mainVideo');
        mainVideo.srcObject = selectedPeerConnection.getRemoteStreams()[0];
    } else {
        console.error("Peer connection not found for id:", id);
    }
}
// Hàm thêm người tham gia vào danh sách
function addParticipant(id, name) {
    if (!participants.some(p => p.id === id)) {
        participants.push({ id, name });

        const participantsList1 = document.getElementById('participantsList');
        const participantItem = document.createElement('li');

        participantItem.innerHTML = `
            ${name}
            <button onclick="selectParticipant('${id}')">View Video</button> `;
        participantsList1.appendChild(participantItem);
    }
	//console.log("Message received: xxx");
	//participants.forEach(p => console.log(p.id, p.name));
}

// Hàm xóa người tham gia khỏi danh sách
function removeParticipant(id) {
    participants = participants.filter(p => p.id !== id);

    const participantsList1 = document.getElementById('participantsList');
    participantsList1.innerHTML = ''; // Xóa danh sách hiện tại

    // Thêm lại tất cả những người còn trong danh sách
    participants.forEach(p => addParticipant(p.id, p.name));
}


function toggleParticipants() {
    const participantsList1 = document.getElementById('participantsList');
    participantsList1.classList.toggle('hidden');
	
	//console.log("Message received: xxx");
}

const mainVideo = document.getElementById('mainVideo');
let audioContext, analyser, microphone, javascriptNode;
function checkMicrophoneLevel() {
    if (localStream && localStream.getAudioTracks().length > 0) {
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(localStream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.3;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);
        
        javascriptNode.onaudioprocess = function() {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            let values = 0;

            const length = array.length;
            for (let i = 0; i < length; i++) {
                values += array[i];
            }

            const average = values / length;
            // Hiển thị mức âm thanh trung bình lên giao diện
            document.getElementById('microphoneLevel').textContent = `Mic Level: ${Math.round(average)}`;

            // Thay đổi màu sắc hoặc hiển thị thêm thông tin nếu âm thanh từ mic không hoạt động
            if (average < 5) {
                document.getElementById('microphoneStatus').textContent = 'Mic is silent';
                document.getElementById('microphoneStatus').style.color = 'red';
            } else {
                document.getElementById('microphoneStatus').textContent = 'Mic is active';
                document.getElementById('microphoneStatus').style.color = 'green';
            }
        };
    }
}
// Bắt đầu chia sẻ màn hình
function startScreenShare() {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia({ video: true })
            .then(stream => {
                screenStream = stream;
                const screenVideoTrack = stream.getVideoTracks()[0];

                // Thêm track chia sẻ màn hình vào peer connection (thay thế track video)
                for (let id in peerConnections) {
                    const sender = peerConnections[id].getSenders().find(s => s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenVideoTrack);
                    }
                }

                // Hiển thị stream chia sẻ màn hình lên video chính
                mainVideo.srcObject = new MediaStream([screenVideoTrack]);
				checkMicrophoneLevel();
                // Khi chia sẻ màn hình kết thúc
                screenVideoTrack.onended = () => {
                    stopScreenShare();
                };
            })
            .catch(err => {
                console.error("Error sharing screen: ", err);
            });
    } else {
        console.log("getDisplayMedia is not supported in this browser.");
    }
}

// Dừng chia sẻ màn hình
function stopScreenShare() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop()); // Dừng track chia sẻ màn hình
    }

    // Trở lại stream của camera sau khi dừng chia sẻ màn hình
    const videoTrack = localStream.getVideoTracks()[0];
    for (let id in peerConnections) {
        const sender = peerConnections[id].getSenders().find(s => s.track.kind === 'video');
        if (sender) {
            sender.replaceTrack(videoTrack);
        }
    }

    // Hiển thị lại video từ camera lên video chính
    mainVideo.srcObject = localStream;
}


// Bắt đầu luồng media (video và audio)
function startMediaStream() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            
            // Hiển thị camera lên video chính
            mainVideo.srcObject = localStream;

            // Thêm cả audio và video vào peer connection
            for (let id in peerConnections) {
                const pc = peerConnections[id];
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
            }
        })
        .catch(error => {
            console.error('Error accessing media devices.', error);
        });
}

// Bật/tắt micro
function toggleMute() {
    if (localStream && localStream.getAudioTracks().length > 0) {
        const audioTrack = localStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled; // Đảo trạng thái của track

        // Cập nhật nút Micro
        document.getElementById('muteButton').textContent = audioTrack.enabled ? 'Mute Mic' : 'Unmute Mic';
    } else {
        console.error('Audio track is not available.');
    }
}

// Bật/tắt camera
function toggleVideo() {
    if (localStream && localStream.getVideoTracks().length > 0) {
        const videoTrack = localStream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled; // Đảo trạng thái của track

        // Cập nhật nút Camera
        document.getElementById('videoButton').textContent = videoTrack.enabled ? 'Turn Off Camera' : 'Turn On Camera';
    } else {
        console.error('Video track is not available.');
    }
}

// Khởi động stream khi trang được tải
window.onload = startMediaStream;