/*
  import javax.websocket.OnClose; 
  import javax.websocket.OnMessage; 
  import javax.websocket.OnOpen; 
  import javax.websocket.Session; 
  import javax.websocket.server.ServerEndpoint; 
  import java.io.IOException; 
  import java.util.HashSet; 
  import java.util.Set;
  
  @ServerEndpoint("/chat") 
  public class ChatServer {
  
  // Danh sách các session kết nối WebSocket 
	  private static Set<Session> clientSessions = new HashSet<>();
  
  // Khi kết nối WebSocket được mở
 
  @OnOpen 
  public void onOpen(Session session) { 
	  clientSessions.add(session);
	  System.out.println("New connection: " + session.getId()); 
  }
  
  // Khi nhận được tin nhắn từ client
  
  @OnMessage 
  public void onMessage(String message, Session session) throws IOException 
  { 
	  System.out.println("Received message from " + session.getId() +  ": " + message);
  
  // Gửi tin nhắn tới tất cả các client 
	  for (Session clientSession : clientSessions) 
	  { 
		  if (clientSession.isOpen()) 
		  	{
			  clientSession.getBasicRemote().sendText("User " + session.getId() + ": " + message);
			 } 
	  } 
  }
  
  // Khi kết nối WebSocket đóng
  
  @OnClose 
  public void onClose(Session session) {
	  clientSessions.remove(session); 
	  System.out.println("Connection closed: " + session.getId()); 
  } 
}
 */

import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

@ServerEndpoint("/chat")
public class ChatServer {

	// Danh sách các session kết nối WebSocket
	private static Set<Session> clientSessions = new HashSet<>();

	// Khi kết nối WebSocket được mở
	@OnOpen
	public void onOpen(Session session) throws IOException {
		clientSessions.add(session);
		System.out.println("New connection: " + session.getId());

		// Thông báo cho tất cả các client khác về thành viên mới
		broadcastMessage("newParticipant", session.getId(), "User " + session.getId());

		// Gửi danh sách các thành viên hiện có cho thành viên mới tham gia
		sendCurrentParticipants(session);
	}

	// Khi nhận được tin nhắn từ client
	@OnMessage
	public void onMessage(String message, Session session) throws IOException {
		System.out.println("Received message from " + session.getId() + ": " + message);

		// Gửi tin nhắn tới tất cả các client
		for (Session clientSession : clientSessions) {
			if (clientSession.isOpen()) {
				clientSession.getBasicRemote().sendText("{\"type\":\"message\", \"sender\":\"" + "User "
						+ session.getId() + "\", \"message\":\"" + message + "\"}");
			}
		}
	}

	// Khi kết nối WebSocket đóng
	@OnClose
	public void onClose(Session session) throws IOException {
		clientSessions.remove(session);
		System.out.println("Connection closed: " + session.getId());

		// Thông báo cho tất cả các client khác về thành viên đã rời đi
		broadcastMessage("participantLeft", session.getId(), "User " + session.getId());
	}

	// Hàm gửi danh sách thành viên hiện có cho thành viên mới
	private void sendCurrentParticipants(Session newSession) throws IOException {
		for (Session session : clientSessions) {
			if (!session.getId().equals(newSession.getId()) && session.isOpen()) {
				newSession.getBasicRemote().sendText("{\"type\":\"newParticipant\", \"id\":\"" + session.getId()
						+ "\", \"name\":\"User " + session.getId() + "\"}");
			}
		}
	}

	// Hàm phát thông điệp tới tất cả các client
	private void broadcastMessage(String type, String id, String name) throws IOException {
		String message = "{\"type\":\"" + type + "\", \"id\":\"" + id + "\", \"name\":\"" + name + "\"}";
		for (Session session : clientSessions) {
			if (session.isOpen()) {
				session.getBasicRemote().sendText(message);
			}
		}
	}
}
