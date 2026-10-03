import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState } from "react";
import {ScaleLoader} from "react-spinners";

function ChatWindow() {
    const {prompt, setPrompt, setReply, currThreadId, setPrevChats, setNewChat, setAllThreads} = useContext(MyContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");

    const getReply = async (event) => {
        event?.preventDefault();
        const message = prompt.trim();

        if (!message || loading) return;

        setLoading(true);
        setError("");
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message,
                threadId: currThreadId
            })
        };

        try {
            const response = await fetch("/api/chat", options);
            const res = await response.json();

            if (!response.ok) {
                throw new Error(res.error || "Could not generate a reply.");
            }

            setPrevChats((chats) => [
                ...chats,
                { role: "user", content: message },
                { role: "assistant", content: res.reply }
            ]);
            setAllThreads((threads) => [
                { threadId: currThreadId, title: message.slice(0, 80) },
                ...threads.filter((thread) => thread.threadId !== currThreadId)
            ]);
            setReply(res.reply);
            setPrompt("");
            setNewChat(false);
        } catch(err) {
            setError(err.message || "Could not connect to the chat service.");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileClick = () => {
        setIsOpen(!isOpen);
    }

    return (
        <div className="chatWindow">
            <div className="navbar">
                <span>NovaGPT <i className="fa-solid fa-chevron-down"></i></span>
                <div className="userIconDiv" onClick={handleProfileClick}>
                    <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                </div>
            </div>
            {
                isOpen && 
                <div className="dropDown">
                    <div className="dropDownItem"><i className="fa-solid fa-gear"></i> Settings</div>
                    <div className="dropDownItem"><i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan</div>
                    <div className="dropDownItem"><i className="fa-solid fa-arrow-right-from-bracket"></i> Log out</div>
                </div>
            }
            <Chat></Chat>

            <div className="responseStatus" aria-live="polite">
                <ScaleLoader color="#fff" loading={loading} />
                {error && <p className="errorMessage" role="alert">{error}</p>}
            </div>
            
            <form className="chatInput" onSubmit={getReply}>
                <div className="inputBox">
                    <input placeholder="Ask anything"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        aria-label="Ask anything"
                        disabled={loading}
                    >
                           
                    </input>
                    <button id="submit" type="submit" aria-label="Send message" disabled={loading || !prompt.trim()}>
                        <i className="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
                <p className="info">
                    AI can make mistakes. Check important information.
                </p>
            </form>
        </div>
    )
}

export default ChatWindow;