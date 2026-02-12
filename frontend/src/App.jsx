import { useState, useEffect, useRef, useMemo } from "react";

// Generate simple unique ID
const getUserId = () => {
  let id = localStorage.getItem("lakshay_ai_user");
  if (!id) {
    id = "user_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("lakshay_ai_user", id);
  }
  return id;
};

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ✅ Generate only once
  const userId = useMemo(() => getUserId(), []);

  // ✅ Scroll function (you removed it earlier)
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = { sender: "You", text: message };
    setChat((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          userId
        }),
      });

      const data = await res.json();

      setChat((prev) => [
        ...prev,
        { sender: "Lakshay AI", text: data.reply }
      ]);

    } catch (error) {
      setChat((prev) => [
        ...prev,
        { sender: "System", text: "Connection error." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>

        {/* Header */}
        <header style={styles.header}>
          <h2 style={styles.title}>Lakshay AI</h2>
          <p style={styles.subtitle}>Personal Assistant</p>

          <button
            onClick={() => {
              setChat([]);
              localStorage.removeItem("lakshay_ai_user");
              window.location.reload();
            }}
            style={styles.resetBtn}
          >
            Reset
          </button>
        </header>

        {/* Chat Window */}
        <div style={styles.chatWindow}>
          {chat.length === 0 && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: "28px" }}>🤖</div>
              <p>How can I help you today?</p>
            </div>
          )}

          {chat.map((msg, index) => (
            <div
              key={index}
              style={{
                ...styles.messageWrapper,
                justifyContent:
                  msg.sender === "You" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  ...styles.bubble,
                  backgroundColor:
                    msg.sender === "You" ? "#007AFF" : "#F2F2F7",
                  color: msg.sender === "You" ? "#fff" : "#000",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && <div style={styles.typing}>AI is typing...</div>}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          <input
            style={styles.input}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
          />
          <button
            style={styles.sendBtn}
            onClick={sendMessage}
            disabled={loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)",
  },
  container: {
    width: "100%",
    maxWidth: "450px",
    height: "85vh",
    backgroundColor: "#fff",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
    overflow: "hidden",
  },
  header: {
    padding: "20px",
    textAlign: "center",
    borderBottom: "1px solid #eee",
    position: "relative",
  },
  title: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: "700",
  },
  subtitle: {
    margin: 0,
    fontSize: "0.8rem",
    color: "#666",
  },
  resetBtn: {
    position: "absolute",
    right: "15px",
    top: "15px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    color: "#888",
  },
  chatWindow: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  messageWrapper: {
    display: "flex",
    width: "100%",
  },
  bubble: {
    maxWidth: "80%",
    padding: "12px 18px",
    borderRadius: "18px",
    fontSize: "0.95rem",
  },
  typing: {
    fontSize: "0.85rem",
    color: "#999",
    fontStyle: "italic",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#aaa",
  },
  inputArea: {
    padding: "20px",
    display: "flex",
    gap: "10px",
    borderTop: "1px solid #eee",
  },
  input: {
    flex: 1,
    padding: "12px 18px",
    borderRadius: "25px",
    border: "1px solid #ddd",
    outline: "none",
  },
  sendBtn: {
    padding: "12px 18px",
    borderRadius: "25px",
    border: "none",
    backgroundColor: "#007AFF",
    color: "#fff",
    cursor: "pointer",
  },
};

export default App;
