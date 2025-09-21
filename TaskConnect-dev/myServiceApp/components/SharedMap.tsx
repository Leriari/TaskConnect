import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const sharedLocation = { latitude: -1.286389, longitude: 36.817223 };

export default function SharedMap({ city = 'Nairobi' }) {
  if (Platform.OS === 'web') {
    const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet');
    return (
      <View style={{ height: 300, width: '100%' }}>
        <MapContainer center={[sharedLocation.latitude, sharedLocation.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker position={[sharedLocation.latitude, sharedLocation.longitude]}>
            <Popup>{city}</Popup>
          </Marker>
        </MapContainer>
      </View>
    );
  }

  const MapView = require('react-native-maps').default;
  const { Marker, PROVIDER_GOOGLE } = require('react-native-maps');

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: sharedLocation.latitude,
        longitude: sharedLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      <Marker coordinate={sharedLocation} title={city} />
    </MapView>
  );
}
