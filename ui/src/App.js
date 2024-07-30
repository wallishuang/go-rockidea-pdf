import './App.css';
import { FormattedMessage, IntlProvider } from "react-intl";
import TabButton from './TabButton';
import React, { useState, useEffect } from 'react';
import MergeTab from './MergeTab';
import SplitTab from './SplitTab';

function App() {
  const [activeTab, setActiveTab] = useState('mergeTab');
  const browserLang = navigator.language.split(/[-_]/)[0]; // 获取浏览器语言码
  const [lang, setLang] = useState(browserLang); // 使用浏览器语言码作为默认语言
  const [locale, setLocale] = useState(undefined);

  // Fetch language data based on selected language code
  useEffect(() => {
    const fetchLocale = async () => {
      try {
        const resp = await fetch(`./lang/${lang}.json`);
        if (!resp.ok) {
          throw new Error(`Failed to fetch language file for ${lang}`);
        }
        const data = await resp.json();
        setLocale(data);
      } catch (error) {
        console.error(error);
        // Handle error fetching language file (e.g., fallback to default language)
        // For simplicity, you can set default messages here or display an error message
      }
    };

    fetchLocale();
  }, [lang]);

  // Function to handle tab clicks
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  // Function to handle language change
  const handleChangeLang = (e) => {
    const selectedLang = e.target.value;
    setLang(selectedLang);
  };

  return (
    <IntlProvider locale={lang} messages={locale || {}}>
      <div className="app-container">
        {/* Language dropdown in the top right corner */}
        <div className="language-dropdown">
          <select value={lang} onChange={handleChangeLang}>
            <option value="en">English</option>
            <option value="zh">繁體中文</option>
            <option value="cn">简体中文</option>
            <option value="jp">日本語</option>
            {/* Add more languages as needed */}
          </select>
        </div>

        {/* Tab buttons */}
        <TabButton
          isActive={activeTab === 'mergeTab'}
          onClick={() => handleTabClick('mergeTab')}
        >
          <FormattedMessage
            id="merge.tab"
            defaultMessage="合併檔案"
          />
        </TabButton>
        <TabButton
          isActive={activeTab === 'splitTab'}
          onClick={() => handleTabClick('splitTab')}
        >
          <FormattedMessage
            id="split.tab"
            defaultMessage="拆分檔案"
          />
        </TabButton>

        {/* Render MergeTab or SplitTab based on activeTab */}
        {activeTab === 'mergeTab' && <MergeTab />}
        {activeTab === 'splitTab' && <SplitTab />}
      </div>
    </IntlProvider>
  );
}

export default App;
