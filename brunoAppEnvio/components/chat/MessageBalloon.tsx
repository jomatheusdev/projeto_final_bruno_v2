import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  action?: string;
  isSystemMessage?: boolean;
  showProductList?: boolean;
  productList?: Product[];
}

interface BalloonProps {
  message: Message;
  currentUserId: string | null;
  onAddToCart: (product: Product) => void;
}

const MessageBalloon = ({ message, currentUserId, onAddToCart }: BalloonProps) => {
  const isAi = message.userId === 'ai-assistant';
  const isSelf = message.userId === currentUserId;
  const isSystem = message.isSystemMessage;
  
  if (isSystem) {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessageText}>{message.text}</Text>
      </View>
    );
  }
  
  const bubbleWrapper = isAi ? styles.bubbleWrapperAi : 
                       isSelf ? styles.bubbleWrapperSent : styles.bubbleWrapperReceived;
  
  const balloonColor = isAi ? styles.balloonAi : 
                      isSelf ? styles.balloonSent : styles.balloonReceived;
  
  const balloonTextColor = (isSelf || isAi) ? styles.balloonTextSent : styles.balloonTextReceived;

  return (
    <View style={[styles.bubbleWrapper, bubbleWrapper]}>
      <View style={[styles.balloon, balloonColor]}>
        <Text style={[styles.senderName, balloonTextColor]}>
          {isAi ? 'Assistente IA' : message.userName}
        </Text>
        <Text style={[styles.balloonText, balloonTextColor]}>
          {message.text}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
        
        {message.showProductList && message.productList && message.productList.length > 0 && (
          <View style={styles.inlineProductList}>
            {message.productList.map((product) => (
              <View key={product.id} style={styles.inlineProductItem}>
                <Text style={styles.inlineProductName}>• {product.name}</Text>
                <Text style={styles.inlineProductPrice}>R$ {product.price.toFixed(2)}</Text>
                <TouchableOpacity 
                  style={styles.inlineAddButton}
                  onPress={() => onAddToCart(product)}
                >
                  <Text style={styles.inlineAddButtonText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleWrapper: { 
    flexDirection: 'row',
    marginBottom: 8,
  },
  bubbleWrapperSent: {
    alignSelf: 'flex-end',
    marginLeft: 40,
  },
  bubbleWrapperAi: {
    alignSelf: 'flex-start',
    marginRight: 40,
  },
  bubbleWrapperReceived: {
    alignSelf: 'flex-start',
    marginRight: 40,
  },
  balloon: {
    padding: 10,
    borderRadius: 16,
    maxWidth: '80%',
    minWidth: 100,
    flexShrink: 1,
  },
  balloonSent: {
    backgroundColor: '#007bff',
  },
  balloonAi: {
    backgroundColor: '#8a2be2',
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
  senderName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 9,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  systemMessageText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  inlineProductList: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: 8,
  },
  inlineProductItem: {
    marginBottom: 8,
  },
  inlineProductName: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  inlineProductPrice: {
    fontSize: 14,
    color: '#ffff00',
    marginBottom: 4,
  },
  inlineAddButton: {
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 4,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  inlineAddButtonText: {
    color: '#8a2be2',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MessageBalloon;
