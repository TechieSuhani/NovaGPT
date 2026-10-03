import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState } from "react";
import {ScaleLoader} from "react-spinners";

function ChatWindow() {
    const {
        prompt, setPrompt, setReply, currThreadId, setPrevChats, setNewChat,
        setAllThreads, theme, setTheme, responseStyle, setResponseStyle,
        responseLanguage, setResponseLanguage, plan, setPlan
    } = useContext(MyContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const [activePanel, setActivePanel] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(true);
    const [planNotice, setPlanNotice] = useState("");

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
                threadId: currThreadId,
                responseStyle,
                responseLanguage
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

    const openPanel = (panel) => {
        setActivePanel(panel);
        setIsOpen(false);
        setPlanNotice("");
    };

    const closePanel = () => setActivePanel("");

    return (
        <div className="chatWindow">
            <div className="navbar">
                <span>NovaGPT <i className="fa-solid fa-chevron-down"></i></span>
                <button className="userIconDiv" type="button" aria-label="Account menu" aria-expanded={isOpen} onClick={handleProfileClick}>
                    <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                </button>
            </div>
            {
                isOpen && 
                <div className="dropDown">
                    <button className="dropDownItem" type="button" onClick={() => openPanel("settings")}><i className="fa-solid fa-gear"></i> Settings</button>
                    <button className="dropDownItem" type="button" onClick={() => openPanel("upgrade")}><i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan</button>
                    <button className="dropDownItem" type="button" onClick={() => {
                        setIsLoggedIn(false);
                        openPanel("login");
                    }}><i className="fa-solid fa-arrow-right-from-bracket"></i> Log out</button>
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
            {activePanel && (
                <div className="modalBackdrop" onMouseDown={(event) => {
                    if (event.target === event.currentTarget && activePanel !== "login") closePanel();
                }}>
                    {activePanel === "settings" && (
                        <section className="accountModal settingsModal" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
                            <div className="modalHeader">
                                <div>
                                    <p className="modalEyebrow">PERSONALIZE</p>
                                    <h2 id="settingsTitle">Settings</h2>
                                </div>
                                <button className="modalClose" type="button" aria-label="Close settings" onClick={closePanel}><i className="fa-solid fa-xmark"></i></button>
                            </div>
                            <label className="settingRow">
                                <span><strong>Appearance</strong><small>Choose how NovaGPT looks</small></span>
                                <select value={theme} onChange={(event) => setTheme(event.target.value)}>
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </label>
                            <label className="settingRow">
                                <span><strong>Response style</strong><small>Set the level of detail</small></span>
                                <select value={responseStyle} onChange={(event) => setResponseStyle(event.target.value)}>
                                    <option value="concise">Concise</option>
                                    <option value="balanced">Balanced</option>
                                    <option value="detailed">Detailed</option>
                                </select>
                            </label>
                            <label className="settingRow">
                                <span><strong>Response language</strong><small>Choose the language for replies</small></span>
                                <select value={responseLanguage} onChange={(event) => setResponseLanguage(event.target.value)}>
                                    <option value="auto">Match my prompt</option>
                                    <option value="english">English</option>
                                    <option value="hindi">Hindi</option>
                                </select>
                            </label>
                            <p className="modalFootnote">Preferences are saved in this browser.</p>
                        </section>
                    )}
                    {activePanel === "upgrade" && (
                        <section className="accountModal pricingModal" role="dialog" aria-modal="true" aria-labelledby="pricingTitle">
                            <div className="modalHeader">
                                <div>
                                    <p className="modalEyebrow">PLANS</p>
                                    <h2 id="pricingTitle">Choose your plan</h2>
                                </div>
                                <button className="modalClose" type="button" aria-label="Close plans" onClick={closePanel}><i className="fa-solid fa-xmark"></i></button>
                            </div>
                            <p className="pricingIntro">Simple example pricing in INR. No payment is collected in this demo.</p>
                            <div className="planGrid">
                                {[
                                    { name: "Free", price: "₹0", description: "For trying NovaGPT", features: ["AI chat", "Conversation history"] },
                                    { name: "Plus", price: "₹399", description: "For everyday projects", features: ["Everything in Free", "More room to explore"] },
                                    { name: "Pro", price: "₹799", description: "For power users", features: ["Everything in Plus", "Priority experience"] }
                                ].map((item) => (
                                    <article className={`planCard${plan === item.name ? " selectedPlan" : ""}`} key={item.name}>
                                        <h3>{item.name}</h3>
                                        <p className="planPrice">{item.price}<span>{item.price === "₹0" ? " / forever" : " / month"}</span></p>
                                        <p className="planDescription">{item.description}</p>
                                        <ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                                        <button type="button" className="planButton" onClick={() => {
                                            if (item.name === "Free") {
                                                setPlan("Free");
                                                setPlanNotice("Free plan selected for this demo.");
                                            } else {
                                                setPlanNotice("Checkout is not connected yet; no payment was made.");
                                            }
                                        }}>{plan === item.name ? "Current plan" : item.name === "Free" ? "Choose Free" : "Coming soon"}</button>
                                    </article>
                                ))}
                            </div>
                            {planNotice && <p className="planNotice" role="status">{planNotice}</p>}
                            <p className="modalFootnote">Sample prices only. Paid plans and checkout are not active.</p>
                        </section>
                    )}
                    {activePanel === "login" && (
                        <section className="accountModal loginModal" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
                            <div className="loginLogo"><i className="fa-solid fa-comment-dots"></i></div>
                            <p className="modalEyebrow">NOVAGPT ACCOUNT</p>
                            <h2 id="loginTitle">You’re signed out</h2>
                            <p>Sign-in is not connected in this demo yet. Continue as a guest to use NovaGPT.</p>
                            <button className="primaryModalButton" type="button" onClick={() => {
                                setIsLoggedIn(true);
                                closePanel();
                            }}>Continue with demo</button>
                            <small className="modalFootnote">This demo does not create or authenticate an account.</small>
                        </section>
                    )}
                </div>
            )}
            {!isLoggedIn && <span className="srOnly" aria-live="polite">Signed out</span>}
        </div>
    )
}

export default ChatWindow;