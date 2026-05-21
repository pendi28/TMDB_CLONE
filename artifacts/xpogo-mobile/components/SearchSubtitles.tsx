/**
 * SearchSubtitles.tsx — updated to use backend subtitle proxy
 * Replaces direct calls to rest.opensubtitles.org (deprecated) with
 * the /api/subtitles/* routes on the API server.
 *
 * Drop this file into:  artifacts/xpogo-mobile/components/SearchSubtitles.tsx
 */
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import useThemeStore from '../lib/zustand/themeStore';
import { ScrollView } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { TextTracks, TextTrackType } from 'react-native-video';
import Constants from 'expo-constants';

// ── Backend URL ─────────────────────────────────────────────────────
// Set EXPO_PUBLIC_API_URL in your .env / EAS secrets to point at the
// deployed API server, e.g. https://your-app.replit.app/api
const API_BASE: string =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://xpogo.replit.app'; // fallback: ganti dengan domain deploy kamu

interface SubLink {
  title: string;
  downloadLink: string;
  language?: string;
}

interface SearchResponse {
  name: string;
  language: string;
  links: SubLink[];
}

const SearchSubtitles = ({
  searchQuery,
  setSearchQuery,
  setExternalSubs,
  mediaType,
  season,
  episode,
}: {
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  setExternalSubs: React.Dispatch<React.SetStateAction<TextTracks>>;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
}) => {
  const { primary } = useThemeStore(state => state);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<SubLink[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [subLang, setSubLang] = useState('ind');

  const subLanguageIds = [
    { name: 'Indonesian', id: 'ind' },
    { name: 'English', id: 'eng' },
    { name: 'Spanish', id: 'spa' },
    { name: 'French', id: 'fre' },
    { name: 'German', id: 'ger' },
    { name: 'Italian', id: 'ita' },
    { name: 'Portuguese', id: 'por' },
    { name: 'Russian', id: 'rus' },
    { name: 'Chinese', id: 'chi' },
    { name: 'Japanese', id: 'jpn' },
    { name: 'Korean', id: 'kor' },
    { name: 'Arabic', id: 'ara' },
    { name: 'Hindi', id: 'hin' },
    { name: 'Dutch', id: 'dut' },
    { name: 'Swedish', id: 'swe' },
    { name: 'Polish', id: 'pol' },
    { name: 'Turkish', id: 'tur' },
    { name: 'Vietnamese', id: 'vie' },
    { name: 'Malay', id: 'may' },
  ];

  const searchSubtitles = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setSearchResults([]);
    try {
      let url: string;
      const encodedName = encodeURIComponent(searchQuery.trim().replace(/\s+/g, '-'));

      if (mediaType === 'tv' && season && episode) {
        url = `${API_BASE}/api/subtitles/search/show/${subLang}/${encodedName}/${season}/${episode}?totalLink=8`;
      } else {
        url = `${API_BASE}/api/subtitles/search/movie/${subLang}/${encodedName}?totalLink=8`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: SearchResponse = await response.json();

      if (!data.links || data.links.length === 0) {
        setError('Subtitle tidak ditemukan. Coba judul berbeda.');
        return;
      }
      setSearchResults(data.links);
    } catch (e: any) {
      setError(e?.message ?? 'Gagal mencari subtitle');
      ToastAndroid.show('Gagal mencari subtitle', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };

  const selectSubtitle = (item: SubLink) => {
    setSearchModalVisible(false);
    // Use the backend read endpoint as the URI so react-native-video can fetch it
    const readUri = `${API_BASE}/api/subtitles/read?url=${encodeURIComponent(item.downloadLink)}`;
    setExternalSubs(prev => [
      {
        type: TextTrackType.SUBRIP,
        language: item.language ?? subLang,
        title: item.title,
        uri: readUri,
      },
      ...prev,
    ]);
  };

  return (
    <View>
      <TouchableOpacity
        className="flex-row gap-3 items-center rounded-md my-1 overflow-hidden ml-2"
        onPress={() => setSearchModalVisible(true)}>
        <MaterialIcons name="add" size={20} color="white" />
        <Text className="text-base font-semibold text-white">
          search subtitles online
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
        visible={searchModalVisible}
        onRequestClose={() => setSearchModalVisible(false)}>
        <SafeAreaView className="h-full w-full bg-black bg-opacity-80">
          <View className="flex-row justify-start items-center gap-x-4 px-4 py-2">
            <MaterialIcons
              name="arrow-back-ios-new"
              size={24}
              color="white"
              onPress={() => setSearchModalVisible(false)}
            />
            <Text className="text-white text-xl font-semibold">
              Cari Subtitle
            </Text>
          </View>

          <View className="flex-row justify-between items-center px-4 py-2 gap-2">
            <TextInput
              placeholder="Nama film / serial"
              className="bg-quaternary flex-1 rounded-md p-2 text-white"
              onChangeText={text => setSearchQuery(text)}
              value={searchQuery}
              returnKeyType="search"
              onSubmitEditing={searchSubtitles}
            />
            <View className="bg-quaternary w-16 h-11 rounded-md p-1 justify-center">
              <Dropdown
                selectedTextStyle={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}
                containerStyle={{
                  borderColor: '#363636', width: 140, paddingLeft: 5,
                  borderRadius: 5, backgroundColor: 'black', maxHeight: 450,
                }}
                labelField="id"
                valueField="id"
                placeholder="Lang"
                value={subLang}
                data={subLanguageIds}
                onChange={item => setSubLang(item.id)}
                renderItem={({ name }) => (
                  <Text className="text-lg p-1 text-white/60 bg-black">{name}</Text>
                )}
              />
            </View>
            <TouchableOpacity onPress={searchSubtitles}>
              <MaterialIcons name="search" size={34} color={primary} />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 py-2" contentContainerStyle={{ flexGrow: 1 }}>
            {loading ? (
              <View className="w-full h-full justify-center items-center">
                <ActivityIndicator size="large" color={primary} />
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  className="flex-row justify-between items-center gap-x-4 p-3 my-1 border border-white/10 rounded-md"
                  onPress={() => selectSubtitle(item)}>
                  <View className="flex-1">
                    <Text className="text-white text-sm font-semibold" numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text className="text-white/50 text-xs mt-1">
                      {item.language?.toUpperCase() ?? subLang.toUpperCase()}
                    </Text>
                  </View>
                  <MaterialIcons name="download" size={22} color={primary} />
                </TouchableOpacity>
              ))
            ) : (
              <View className="w-full h-full justify-center items-center">
                <Text className="text-red-700 text-lg font-semibold text-center px-4">
                  {error || 'Ketik judul lalu tekan Cari'}
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default SearchSubtitles;
