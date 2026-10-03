import "./Chat.css";
import { useContext, useState, useEffect, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

function Chat() {
    const {newChat, prevChats, reply, responseLanguage} = useContext(MyContext);
    const [latestReply, setLatestReply] = useState({ reply: null, content: null });
    const [speakingId, setSpeakingId] = useState(null);
    const speechUtteranceRef = useRef(null);

    useEffect(() => {
        if (reply === null || !prevChats?.length) return;

        const content = reply.split(" ");

        let idx = 0;
        const interval = setInterval(() => {
            setLatestReply({
                reply,
                content: content.slice(0, idx + 1).join(" ")
            });

            idx++;
            if(idx >= content.length) clearInterval(interval);
        }, 40);

        return () => clearInterval(interval);

    }, [prevChats, reply])

    useEffect(() => () => {
        window.speechSynthesis?.cancel();
        speechUtteranceRef.current = null;
    }, []);

    const speakReply = (content, id) => {
        if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
            return;
        }

        if (speakingId === id) {
            speechUtteranceRef.current = null;
            window.speechSynthesis.cancel();
            setSpeakingId(null);
            return;
        }

        speechUtteranceRef.current = null;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
            content.replace(/```[\s\S]*?```/g, " Code block omitted. ")
                .replace(/[`*_>#()[\]]/g, " ")
                .replace(/https?:\/\/\S+/g, " link ")
        );
        utterance.lang = responseLanguage === "hindi"
            ? "hi-IN"
            : responseLanguage === "english"
                ? "en-US"
                : /[\u0900-\u097F]/.test(content)
                    ? "hi-IN"
                    : navigator.language || "en-US";
        utterance.onend = () => {
            if (speechUtteranceRef.current === utterance) {
                speechUtteranceRef.current = null;
                setSpeakingId(null);
            }
        };
        utterance.onerror = () => {
            if (speechUtteranceRef.current === utterance) {
                speechUtteranceRef.current = null;
                setSpeakingId(null);
            }
        };
        speechUtteranceRef.current = utterance;
        setSpeakingId(id);
        window.speechSynthesis.speak(utterance);
    };

    const renderAssistantMessage = (content, id) => (
        <div className="assistantMessage">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown>
            <button
                className="speakReplyButton"
                type="button"
                aria-label={speakingId === id ? "Stop reading reply aloud" : "Read reply aloud"}
                title={speakingId === id ? "Stop reading" : "Read aloud"}
                onClick={() => speakReply(content, id)}
            >
                <i className={`fa-solid ${speakingId === id ? "fa-stop" : "fa-volume-high"}`}></i>
            </button>
        </div>
    );

    return (
        <main className="conversation">
            {newChat && prevChats.length === 0 && (
                <h1 className="welcomeTitle">What can I help with?</h1>
            )}
            <div className="chats" aria-live="polite">
                {
                    prevChats?.slice(0, -1).map((chat, idx) => 
                        <div className={chat.role === "user"? "userDiv" : "gptDiv"} key={idx}>
                            {
                                chat.role === "user"? 
                                <p className="userMessage">{chat.content}</p> : 
                                renderAssistantMessage(chat.content, `history-${idx}`)
                            }
                        </div>
                    )
                }

                {
                    prevChats.length > 0  && (
                        <>
                                {latestReply.reply !== reply || latestReply.content === null ? (
                                    <div className="gptDiv" key="non-typing">
                                        {renderAssistantMessage(prevChats[prevChats.length-1].content, "latest")}
                                    </div>
                                ) : (
                                    <div className="gptDiv" key="typing">
                                        {renderAssistantMessage(latestReply.content, "latest")}
                                    </div>
                                )}
                        </>
                    )
                }

            </div>
        </main>
    )
}

export default Chat;