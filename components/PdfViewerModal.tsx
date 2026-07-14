// In-app PDF viewer. Fetches an authenticated PDF as base64 and renders it
// inside a WebView with pdf.js (CDN) — so receipts/statements open WITHIN the
// app, not a share sheet. A Download button saves the same file to the device.
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../constants/theme';
import { fetchAuthFileBase64, saveAuthFileToDevice } from '../utils/downloadAuthFile';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Remote (authenticated) PDF URL. */
  url: string | null;
  accessToken: string | null;
  /** File name used when the user taps Download. */
  fileName: string;
}

// pdf.js host page — renders each page to a width-fitted canvas on a grey
// backdrop, like a native PDF viewer. Receives the base64 via renderPdf().
const HOST_HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3">
<style>
  html,body{margin:0;padding:0;background:#53565c;}
  #root{padding:8px 0 24px;}
  canvas{display:block;margin:8px auto;max-width:96%;box-shadow:0 2px 8px rgba(0,0,0,.45);border-radius:2px;background:#fff;}
  #msg{color:#e8e8ea;font:14px -apple-system,Roboto,sans-serif;text-align:center;padding:40px 24px;}
</style></head>
<body>
<div id="msg">Loading…</div>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
  var RN=function(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(m);};
  function b64ToArr(b64){var bin=atob(b64);var len=bin.length;var arr=new Uint8Array(len);for(var i=0;i<len;i++)arr[i]=bin.charCodeAt(i);return arr;}
  window.renderPdf=function(b64){
    try{
      if(!window.pdfjsLib){RN('err:engine');return;}
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfjsLib.getDocument({data:b64ToArr(b64)}).promise.then(function(pdf){
        document.getElementById('msg').style.display='none';
        var root=document.getElementById('root');root.innerHTML='';
        var dpr=window.devicePixelRatio||1;
        var targetW=Math.min(window.innerWidth-16,900);
        var seq=Promise.resolve();
        for(var n=1;n<=pdf.numPages;n++){(function(n){
          seq=seq.then(function(){return pdf.getPage(n).then(function(page){
            var base=page.getViewport({scale:1});
            var scale=targetW/base.width;
            var vp=page.getViewport({scale:scale*dpr});
            var canvas=document.createElement('canvas');
            canvas.width=vp.width;canvas.height=vp.height;canvas.style.width=targetW+'px';
            root.appendChild(canvas);
            return page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
          });});
        })(n);}
        seq.then(function(){RN('ok');}).catch(function(e){RN('err:'+(e&&e.message||e));});
      }).catch(function(e){RN('err:'+(e&&e.message||e));});
    }catch(e){RN('err:'+(e&&e.message||e));}
  };
  RN('ready');
</script></body></html>`;

export const PdfViewerModal: React.FC<Props> = ({ visible, onClose, title, url, accessToken, fileName }) => {
  const { colors } = useTheme();
  const webRef = useRef<WebView>(null);
  const [b64, setB64] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);

  // Fetch the PDF bytes whenever the sheet opens.
  useEffect(() => {
    let off = false;
    if (!visible || !url || !accessToken) return;
    (async () => {
      setStatus('loading'); setB64(null);
      const data = await fetchAuthFileBase64(accessToken, url, fileName);
      if (off) return;
      if (!data) { setStatus('error'); return; }
      setB64(data);
    })();
    return () => { off = true; };
  }, [visible, url, accessToken, fileName]);

  // Once both the WebView engine and the bytes are ready, hand them over.
  const inject = (data: string) => {
    webRef.current?.injectJavaScript(`window.renderPdf(${JSON.stringify(data)}); true;`);
  };
  useEffect(() => { if (b64) inject(b64); }, [b64]);

  const onMessage = (e: { nativeEvent: { data: string } }) => {
    const msg = e.nativeEvent.data;
    if (msg === 'ready') { if (b64) inject(b64); }
    else if (msg === 'ok') setStatus('ready');
    else if (msg.startsWith('err')) setStatus('error');
  };

  const download = async () => {
    if (!url || !accessToken || saving) return;
    setSaving(true);
    try { await saveAuthFileToDevice(accessToken, url, { fileName }); } catch {}
    setSaving(false);
  };

  const styles = makeStyles(colors);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity hitSlop={8} onPress={onClose} style={styles.hBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.hTitle} numberOfLines={1}>{title}</Text>
          <TouchableOpacity hitSlop={8} onPress={download} style={styles.hBtn} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="download-outline" size={21} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html: HOST_HTML }}
            onMessage={onMessage}
            javaScriptEnabled
            style={{ flex: 1, backgroundColor: '#53565c' }}
          />
          {status !== 'ready' && (
            <View style={styles.overlay} pointerEvents={status === 'error' ? 'auto' : 'none'}>
              {status === 'loading' ? (
                <>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.overlayText}>Loading document…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="document-outline" size={40} color="#fff" />
                  <Text style={styles.overlayText}>Couldn’t display this document.</Text>
                  <TouchableOpacity style={styles.overlayBtn} onPress={download}>
                    <Ionicons name="download-outline" size={16} color={colors.primaryDeep} />
                    <Text style={styles.overlayBtnText}>Download instead</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

function makeStyles(c: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingTop: 52, paddingBottom: 12,
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    hBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    hTitle: { flex: 1, fontSize: 15, fontFamily: fonts.bold, color: c.text, textAlign: 'center' },
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(40,42,46,0.9)', gap: 12, padding: 24,
    },
    overlayText: { color: '#fff', fontSize: 14, fontFamily: fonts.medium, textAlign: 'center' },
    overlayBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
      backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    },
    overlayBtnText: { color: c.primaryDeep, fontSize: 13, fontFamily: fonts.bold },
  });
}
