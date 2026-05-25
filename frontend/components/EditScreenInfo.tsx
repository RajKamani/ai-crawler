import { StyleSheet } from 'react-native';

import { ExternalLink } from './ExternalLink';
import { MonoText } from './StyledText';
import { Text, View } from './Themed';

import Colors from '@/constants/Colors';

export default function EditScreenInfo({ path }: { path: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.getStartedContainer}>
        <Text style={styles.getStartedText}>
          OPEN UP THE CODE FOR THIS SCREEN:
        </Text>

        <View style={styles.codeHighlightContainer}>
          <MonoText style={styles.codeText}>{path}</MonoText>
        </View>

        <Text style={styles.getStartedText}>
          CHANGE ANY OF THE TEXT, SAVE THE FILE, AND YOUR APP WILL AUTOMATICALLY UPDATE.
        </Text>
      </View>

      <View style={styles.helpContainer}>
        <ExternalLink
          style={styles.helpLink}
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet">
          <Text style={styles.helpLinkText}>
            TAP HERE IF YOUR APP DOESN'T AUTOMATICALLY UPDATE AFTER MAKING CHANGES
          </Text>
        </ExternalLink>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fcf9f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedContainer: {
    alignItems: 'center',
    marginHorizontal: 32,
    gap: 12,
  },
  codeHighlightContainer: {
    backgroundColor: '#f0eded',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 8,
  },
  codeText: {
    color: '#1c1b1b',
    fontSize: 13,
  },
  getStartedText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
    color: '#926f6a',
  },
  helpContainer: {
    marginTop: 24,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  helpLink: {
    paddingVertical: 12,
  },
  helpLinkText: {
    textAlign: 'center',
    color: '#bc000a',
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
  },
});
