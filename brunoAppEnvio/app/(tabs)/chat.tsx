import React, { Fragment, useState } from 'react';
import {FlatList,Text,View,StyleSheet,TouchableOpacity,TextInput,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class Message {
  text: string;
  sentBy: string;

  constructor(text: string, sentBy: string) {
    this.text = text;
    this.sentBy = sentBy;
  }
}

const styles = StyleSheet.create({
  bubbleWrapper: { flexDirection: 'row' },
  bubbleWrapperSent: {
    alignSelf: 'flex-end',
    marginLeft: 40,
  },
  bubbleWrapperReceived: {
    alignSelf: 'flex-start',
    marginRight: 40,
  },
  balloon: {
    padding: 8,
    borderRadius: 16,
  },
  balloonSent: {
    backgroundColor: '#007bff',
  },
  balloonReceived: {
    backgroundColor: '#e0e0e0',
  },
  balloonText: {
    fontSize: 18,
  },
  balloonTextSent: {
    color: 'white',
  },
  balloonTextReceived: {
    color: 'black',
  },
});

const Chat = () => {
  const [currentUser, setCurrentUser] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<{ messages: Message[] }>({
    messages: [{text: 'opa, tudo bom? ', sentBy: 'saniel'}],
  });

  return (
    <Fragment>
      <FlatList
      style={{}}
        data={chat.messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => {
          return (
            <Balloon message={item} userLogged={currentUser} />
          );
        }}
        ListEmptyComponent={() => {
          return (
            <Text>Nenhuma mensagem no momento</Text>
          );
        }}
      /> 
      <View style={{}}>
        <TextInput 
        style={{}} 
        placeholder='Escreva uma mensagem'
         onChangeText={(texte) => setMessage(texte)} />
        <TouchableOpacity style={{}}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </Fragment>
  );
};

const Balloon = ({ message, userLogged }: { message: Message; userLogged: string }) => {
  const sent = userLogged === message.sentBy;

  const balloonColor = sent ? styles.balloonSent : styles.balloonReceived;
  const balloonTextColor = sent ? styles.balloonTextSent : styles.balloonTextReceived;
  const bubbleWrapper = sent ? styles.bubbleWrapperSent : styles.bubbleWrapperReceived;

  return (
    <View style={{ marginBottom: '2%' }}>
      <View style={[styles.bubbleWrapper, bubbleWrapper]}>
        <View style={[styles.balloon, balloonColor]}>
          <Text>{message.sentBy}</Text>
          <Text style={[styles.balloonText, balloonTextColor]}>
            {message.text}
          </Text>
        </View>
      </View>
    </View>
  );
};



export default Chat;
