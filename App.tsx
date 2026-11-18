import { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./src/api";

type User = {
  id: string;
  username: string;
  displayName: string;
};

type Conversation = {
  id: string;
  members: User[];
  lastMessage?: { body: string } | null;
};

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender?: User;
};

type Screen = "auth" | "list" | "chat";

export default function App() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [newChatUser, setNewChatUser] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("token");
      const raw = await AsyncStorage.getItem("user");
      if (token && raw) {
        setUser(JSON.parse(raw));
        setScreen("list");
      }
    })();
  }, []);

  async function submitAuth() {
    setError(null);
    setLoading(true);
    try {
      const path =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { username, password }
          : {
              username,
              password,
              displayName: displayName || username,
            };
      const data = await api(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setScreen("list");
    } catch (e: any) {
      setError(e.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadConversations() {
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/conversations");
      setConversations(data.conversations || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (screen === "list") loadConversations();
  }, [screen]);

  async function startChat() {
    if (!newChatUser.trim()) return;
    setError(null);
    try {
      const data = await api("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ username: newChatUser.trim() }),
      });
      setNewChatUser("");
      setActiveId(data.conversation.id);
      setScreen("chat");
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadMessages(id: string) {
    try {
      const data = await api(`/api/conversations/${id}/messages`);
      setMessages(data.messages || []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (screen !== "chat" || !activeId) return;
    loadMessages(activeId);
    const t = setInterval(() => loadMessages(activeId), 2000);
    return () => clearInterval(t);
  }, [screen, activeId]);

  async function sendMessage() {
    if (!activeId || !text.trim()) return;
    const body = text.trim();
    setText("");
    try {
      const data = await api(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setMessages((prev) => [...prev, data.message]);
    } catch (e: any) {
      setError(e.message);
      setText(body);
    }
  }

  function peerName(c: Conversation) {
    const other = c.members.find((m) => m.id !== user?.id);
    return other?.displayName || other?.username || "Chat";
  }

  async function signOut() {
    await AsyncStorage.multiRemove(["token", "user"]);
    setUser(null);
    setScreen("auth");
  }

  if (screen === "auth") {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>Private Messenger</Text>
          <Text style={styles.sub}>
            {mode === "login" ? "Sign in" : "Create account"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          {mode === "register" && (
            <TextInput
              style={styles.input}
              placeholder="Display name"
              placeholderTextColor="#64748b"
              value={displayName}
              onChangeText={setDisplayName}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.btn} onPress={submitAuth} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {mode === "login" ? "Sign in" : "Register"}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() =>
              setMode((m) => (m === "login" ? "register" : "login"))
            }
          >
            <Text style={styles.link}>
              {mode === "login"
                ? "Need an account? Register"
                : "Have an account? Sign in"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === "list") {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Chats</Text>
            <Text style={styles.sub}>@{user?.username}</Text>
          </View>
          <Pressable onPress={signOut}>
            <Text style={styles.link}>Sign out</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Username to chat"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={newChatUser}
            onChangeText={setNewChatUser}
          />
          <Pressable style={styles.btnSmall} onPress={startChat}>
            <Text style={styles.btnText}>Chat</Text>
          </Pressable>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        {loading && <ActivityIndicator color="#3b82f6" />}
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.chatItem}
              onPress={() => {
                setActiveId(item.id);
                setScreen("chat");
              }}
            >
              <Text style={styles.chatName}>{peerName(item)}</Text>
              <Text style={styles.chatPreview} numberOfLines={1}>
                {item.lastMessage?.body || "No messages yet"}
              </Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    );
  }

  // chat screen
  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              setScreen("list");
              setActiveId(null);
            }}
          >
            <Text style={styles.link}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Chat</Text>
          <View style={{ width: 48 }} />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            return (
              <View
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleOther,
                ]}
              >
                <Text style={{ color: "#fff" }}>{item.body}</Text>
              </View>
            );
          }}
        />
        <View style={styles.compose}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Message"
            placeholderTextColor="#64748b"
            value={text}
            onChangeText={setText}
          />
          <Pressable style={styles.btnSmall} onPress={sendMessage}>
            <Text style={styles.btnText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  card: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#f8fafc", fontSize: 20, fontWeight: "700" },
  sub: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnSmall: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    marginLeft: 8,
  },
  btnText: { color: "#fff", fontWeight: "600" },
  link: { color: "#60a5fa", textAlign: "center", marginTop: 8 },
  error: { color: "#fb7185", marginVertical: 8, paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: "center",
  },
  chatItem: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 14,
  },
  chatName: { color: "#f8fafc", fontWeight: "600" },
  chatPreview: { color: "#64748b", marginTop: 4, fontSize: 13 },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#2563eb",
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#1e293b",
  },
  compose: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    alignItems: "center",
  },
});