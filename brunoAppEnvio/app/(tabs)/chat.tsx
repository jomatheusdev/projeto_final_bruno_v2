import React, { useState } from 'react';
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class Message {
  text: string;
  sentBy: string;

  constructor(text: string, sentBy: string) {
    this.text = text;
    this.sentBy = sentBy;
  }
}

const Chat = () => {
  const [currentUser, setCurrentUser] = useState('saniel');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<{ messages: Message[] }>({
    messages: [new Message('opa, tudo bom?', 'saniel')],
  });

  const handleSend = () => {
    if (!message.trim()) return;

    const novaMensagem = new Message(message, currentUser);
    setChat((prev) => ({
      messages: [...prev.messages, novaMensagem],
    }));
    setMessage('');
  };

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.flatList}
        data={chat.messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Balloon message={item} userLogged={currentUser} />
        )}
        ListEmptyComponent={() => (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            Nenhuma mensagem no momento
          </Text>
        )}
      />

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Escreva uma mensagem"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Balloon = ({
  message,
  userLogged,
}: {
  message: Message;
  userLogged: string;
}) => {
  const sent = userLogged === message.sentBy;

  const balloonColor = sent ? styles.balloonSent : styles.balloonReceived;
  const balloonTextColor = sent ? styles.balloonTextSent : styles.balloonTextReceived;
  const bubbleWrapper = sent ? styles.bubbleWrapperSent : styles.bubbleWrapperReceived;

  return (
    <View style={[styles.bubbleWrapper, bubbleWrapper]}>
      <View style={[styles.balloon, balloonColor]}>
        <Text style={[styles.senderName, balloonTextColor]}>
          {message.sentBy}
        </Text>
        <Text style={[styles.balloonText, balloonTextColor]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
};

  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f1f1',
  },

  flatList: {
    flex: 1,
    padding: 10,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1f6feb',
  },
  balloonSent: {
    backgroundColor: '#007bff', 
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'white',
    fontSize: 16,
  },

  sendButton: {
    marginLeft: 8,
    backgroundColor: '#007bff',
    borderRadius: 20,
    padding: 10,
  },

  bubbleWrapper: { flexDirection: 'row' },
  bubbleWrapperSent: {
    alignSelf: 'flex-end',
    marginLeft: 40,
    marginBottom: 8,
  },
  bubbleWrapperReceived: {
    alignSelf: 'flex-start',
    marginRight: 40,
    marginBottom: 8,
  },
  balloon: {
    padding: 10,
    borderRadius: 16,
    maxWidth: '80%',
    minWidth: 100, 
    flexShrink: 1,
  },
 
  balloonReceived: {
    backgroundColor: '#e5e5ea',
  },
  balloonText: {
    fontSize: 16,
  },
  balloonTextSent: {
    color: 'white',
  },
  balloonTextReceived: {
    color: 'black',
  },
});

export default Chat;
