import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// Kita bungkus script Adsterra kamu ke dalam template HTML
const socialBarHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
      body, html { 
        background: transparent !important; 
        margin: 0; 
        padding: 0; 
        overflow: hidden; 
      }
    </style>
  </head>
  <body>
    <script type='text/javascript' src='https://pl29329793.profitablecpmratenetwork.com/7e/f6/3f/7ef63fe80c3a0edff8247d3103aa030e.js'></script>
  </body>
</html>
`;

export default function SocialBar() {
  return (
    <View style={S.overlay} pointerEvents="box-none">
      <WebView
        originWhitelist={['*']}
        source={{ html: socialBarHtml }}
        style={S.webview}
        transparent={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
      />
    </View>
  );
}

const S = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});
