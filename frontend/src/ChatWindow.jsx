import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useEffect, useRef, useState } from "react";
import {ScaleLoader} from "react-spinners";

function ChatWindow() {
    const {
        prompt, setPrompt, setReply, currThreadId, setPrevChats, setNewChat,
        setAllThreads, theme, setTheme, responseStyle, setResponseStyle,
        responseLanguage, setResponseLanguage, plan, setPlan, authUser, setAuthUser
    } = useContext(MyContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [error, setError] = useState("");
    const [activePanel, setActivePanel] = useState("");
    const [planNotice, setPlanNotice] = useState("");
    const [requestedPlan, setRequestedPlan] = useState("");
    const [authMode, setAuthMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");
    const profileAreaRef = useRef(null);
    const modelAreaRef = useRef(null);

    useEffect(() => {
        const closeMenuOnOutsideClick = (event) => {
            if (!profileAreaRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
            if (!modelAreaRef.current?.contains(event.target)) {
                setIsModelMenuOpen(false);
            }
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
                setIsModelMenuOpen(false);
                if (activePanel !== "auth") setActivePanel("");
            }
        };

        document.addEventListener("pointerdown", closeMenuOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [activePanel]);

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

    const openPanel = (panel) => {
        setActivePanel(panel);
        setIsOpen(false);
        setIsModelMenuOpen(false);
        setPlanNotice("");
        setAuthError("");
    };

    const openPlanPicker = (selectedPlan = "") => {
        setRequestedPlan(selectedPlan);
        openPanel("upgrade");
    };

    const closePanel = () => setActivePanel("");

    const submitAuth = async (event) => {
        event.preventDefault();
        if (authLoading) return;

        setAuthLoading(true);
        setAuthError("");

        try {
            const endpoint = authMode === "register" ? "register" : "login";
            const response = await fetch(`/api/auth/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not sign in.");
            }

            setAuthUser(data.user);
            setPassword("");
            setActivePanel("");
        } catch (authRequestError) {
            setAuthError(authRequestError.message || "Could not connect to the sign-in service.");
        } finally {
            setAuthLoading(false);
        }
    };

    const logOut = async () => {
        setAuthError("");
        try {
            const response = await fetch("/api/auth/logout", { method: "POST" });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not log out.");
            }

            setAuthUser(null);
            setAuthMode("login");
            setPassword("");
            openPanel("auth");
        } catch (logoutError) {
            setAuthError(logoutError.message || "Could not connect to the sign-out service.");
        }
    };

    return (
        <div className="chatWindow">
            <div className="navbar">
                <div className="modelArea" ref={modelAreaRef}>
                    <button className="brandButton" type="button" aria-label="Choose NovaGPT version" aria-expanded={isModelMenuOpen} onClick={() => {
                        setIsModelMenuOpen((open) => !open);
                        setIsOpen(false);
                    }}>
                        <span>NovaGPT</span><i className="fa-solid fa-chevron-down"></i>
                    </button>
                    {isModelMenuOpen && (
                        <div className="modelDropdown">
                            <p className="modelMenuLabel">CHOOSE A PLAN</p>
                            <button type="button" className={`modelOption${plan === "Free" ? " activeModel" : ""}`} onClick={() => {
                                setPlan("Free");
                                setIsModelMenuOpen(false);
                            }}>
                                <span><strong>NovaGPT Basic</strong><small>Everyday AI chat</small></span>
                                <span className="modelPrice">Free{plan === "Free" && <i className="fa-solid fa-check"></i>}</span>
                            </button>
                            <button type="button" className={`modelOption${requestedPlan === "Plus" ? " activeModel" : ""}`} onClick={() => openPlanPicker("Plus")}>
                                <span><strong>NovaGPT Plus</strong><small>More room to explore</small></span>
                                <span className="modelPrice">₹399 <small>/ mo</small><i className="fa-solid fa-chevron-right"></i></span>
                            </button>
                            <button type="button" className={`modelOption${requestedPlan === "Pro" ? " activeModel" : ""}`} onClick={() => openPlanPicker("Pro")}>
                                <span><strong>NovaGPT Pro</strong><small>For power users</small></span>
                                <span className="modelPrice">₹799 <small>/ mo</small><i className="fa-solid fa-chevron-right"></i></span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="profileArea" ref={profileAreaRef}>
                    <button className="userIconDiv" type="button" aria-label="Account menu" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
                        <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                    </button>
                    {isOpen && (
                        <div className="dropDown">
                            {authUser && <p className="profileEmail">{authUser.email}</p>}
                            {!authUser && <button className="dropDownItem" type="button" onClick={() => {
                                setAuthMode("login");
                                openPanel("auth");
                            }}><i className="fa-solid fa-user-lock"></i> Log in / Sign up</button>}
                            <button className="dropDownItem" type="button" onClick={() => openPanel("settings")}><i className="fa-solid fa-gear"></i> Settings</button>
                            <button className="dropDownItem" type="button" onClick={() => openPanel("upgrade")}><i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan</button>
                            {authUser && <button className="dropDownItem" type="button" onClick={logOut}><i className="fa-solid fa-arrow-right-from-bracket"></i> Log out</button>}
                        </div>
                    )}
                </div>
            </div>
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
                    if (event.target === event.currentTarget && activePanel !== "auth") closePanel();
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
                                    <article className={`planCard${plan === item.name || requestedPlan === item.name ? " selectedPlan" : ""}`} key={item.name}>
                                        <h3>{item.name}</h3>
                                        <p className="planPrice">{item.price}<span>{item.price === "₹0" ? " / forever" : " / month"}</span></p>
                                        <p className="planDescription">{item.description}</p>
                                        <ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                                        <button type="button" className="planButton" onClick={() => {
                                            if (item.name === "Free") {
                                                setPlan("Free");
                                                setPlanNotice("Free plan selected for this demo.");
                                            } else {
                                                setPlanNotice(`Checkout for NovaGPT ${item.name} is not connected yet; no payment was made.`);
                                            }
                                        }}>{item.name === "Free" && plan === "Free" ? "Current plan" : item.name === "Free" ? "Choose Free" : `Buy ${item.name}`}</button>
                                    </article>
                                ))}
                            </div>
                            {planNotice && <p className="planNotice" role="status">{planNotice}</p>}
                            <p className="modalFootnote">Sample prices only. Paid plans and checkout are not active.</p>
                        </section>
                    )}
                    {activePanel === "auth" && (
                        <section className="accountModal loginModal" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
                            <button className="modalClose authClose" type="button" aria-label="Close sign in" onClick={closePanel}><i className="fa-solid fa-xmark"></i></button>
                            <div className="loginLogo"><i className="fa-solid fa-comment-dots"></i></div>
                            <p className="modalEyebrow">YOUR AI WORKSPACE</p>
                            <h2 id="loginTitle">{authMode === "register" ? "Create your account" : "Welcome back"}</h2>
                            <p>{authMode === "register" ? "Sign up with your email to get started." : "Log in to continue to NovaGPT."}</p>
                            <form className="authForm" onSubmit={submitAuth}>
                                <label>Email address
                                    <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                                </label>
                                <label>Password
                                    <input type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
                                </label>
                                {authError && <p className="authError" role="alert">{authError}</p>}
                                <button className="primaryModalButton" type="submit" disabled={authLoading}>
                                    {authLoading ? "Please wait..." : authMode === "register" ? "Create account" : "Log in"}
                                </button>
                            </form>
                            <p className="authSwitch">
                                {authMode === "register" ? "Already have an account?" : "New to NovaGPT?"}
                                <button type="button" onClick={() => {
                                    setAuthMode((mode) => mode === "register" ? "login" : "register");
                                    setAuthError("");
                                }}>{authMode === "register" ? "Log in" : "Create an account"}</button>
                            </p>
                            <small className="modalFootnote">Passwords are stored as secure hashes and never displayed in your profile.</small>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}

export default ChatWindow;