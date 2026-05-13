"use client";

import AdSenseAd from './AdSenseAd';

export default function AdSenseExample() {
  return (
    <div className="space-y-8 p-4">
      <h2 className="text-2xl font-bold text-center">Przykłady reklam Google AdSense</h2>
      
      {/* Reklama banner na górze */}
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-2">Banner (728x90)</h3>
        <div className="bg-gray-100 p-4 rounded">
          <AdSenseAd 
            adSlot="1234567890" // Zamień na prawdziwy ad slot
            adFormat="horizontal"
            adStyle={{ display: 'block', width: '728px', height: '90px' }}
            className="mx-auto"
          />
        </div>
      </div>

      {/* Reklama w sidebar */}
      <div className="flex gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">Treść</h3>
          <p>To jest przykładowa treść strony z reklamami po bokach.</p>
        </div>
        
        <div className="w-48">
          <h3 className="text-lg font-semibold mb-2">Sidebar (160x600)</h3>
          <div className="bg-gray-100 p-2 rounded">
            <AdSenseAd 
              adSlot="0987654321" // Zamień na prawdziwy ad slot
              adFormat="vertical"
              adStyle={{ display: 'block', width: '160px', height: '600px' }}
            />
          </div>
        </div>
      </div>

      {/* Reklama w treści */}
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-2">W treści (300x250)</h3>
        <div className="bg-gray-100 p-4 rounded">
          <AdSenseAd 
            adSlot="1122334455" // Zamień na prawdziwy ad slot
            adFormat="rectangle"
            adStyle={{ display: 'block', width: '300px', height: '250px' }}
            className="mx-auto"
          />
        </div>
      </div>

      {/* Responsywna reklama */}
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-2">Responsywna reklama</h3>
        <div className="bg-gray-100 p-4 rounded">
          <AdSenseAd 
            adSlot="5566778899" // Zamień na prawdziwy ad slot
            adFormat="auto"
            adStyle={{ display: 'block' }}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
