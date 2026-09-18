import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { haptic } from '../lib/telegram';

const SLIDES = [
  {
    title: 'Barcha daromadlaringiz bir joyda',
    text: "Bog'dorchilik, chorvachilik, tadbirkorlik va chet eldan keladigan pullarni alohida-alohida hisoblang.",
    art: 'sectors',
  },
  {
    title: "Har bir so'mni nazorat qiling",
    text: "Yem-xashak, o'g'it, dori, investitsiya — barcha harajatlarni bir necha soniyada yozib boring.",
    art: 'list',
  },
  {
    title: 'Sof foydangizni aniq biling',
    text: "Grafiklar, oylik reja, qarz daftari va Excel hisobotlar — hammasi cho'ntagingizda.",
    art: 'chart',
  },
];

function Art({ type }) {
  if (type === 'sectors') {
    return (
      <div className="onb-art orbit">
        <div className="orbit-center">📒</div>
        <span className="orbit-item o1" style={{ background: '#E9F8EF' }}>🌳</span>
        <span className="orbit-item o2" style={{ background: '#FDF3E3' }}>🐄</span>
        <span className="orbit-item o3" style={{ background: '#EAF1FE' }}>💼</span>
        <span className="orbit-item o4" style={{ background: '#F1EBFE' }}>✈️</span>
      </div>
    );
  }
  if (type === 'list') {
    const rows = [
      ['🌾', 'Yem-xashak', '−1 200 000', 'red'],
      ['🧪', "O'g'it", '−850 000', 'red'],
      ['🥛', 'Sut sotuvi', '+3 400 000', 'green'],
      ['💸', "Chet eldan o'tkazma", '+6 300 000', 'green'],
    ];
    return (
      <div className="onb-art">
        <div className="mock-card">
          {rows.map(([icon, name, amount, tone], i) => (
            <div className="mock-row" key={name} style={{ animationDelay: `${i * 120}ms` }}>
              <span className="mock-icon">{icon}</span>
              <span className="grow">{name}</span>
              <b className={tone}>{amount}</b>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const bars = [40, 65, 50, 80, 60, 95];
  return (
    <div className="onb-art">
      <div className="mock-card">
        <div className="muted small">Sof foyda · shu oy</div>
        <div className="mock-big green">+8 650 000 so'm</div>
        <div className="mock-bars">
          {bars.map((h, i) => (
            <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Onboarding({ onDone }) {
  const { updateUser } = useApp();
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = () => {
    haptic.success();
    try {
      localStorage.setItem('hisobchi:onboarded', '1');
    } catch {
      /* brauzer xotirasi yopiq bo'lishi mumkin */
    }
    updateUser({ onboarded: true }).catch(() => {});
    onDone();
  };

  const next = () => {
    haptic.light();
    if (last) finish();
    else setIndex(index + 1);
  };

  const slide = SLIDES[index];

  return (
    <div className="onb">
      <div className="onb-top">
        <span className="onb-logo">📒 Hisobchi</span>
        {!last && (
          <button className="link muted" onClick={finish}>
            O'tkazib yuborish
          </button>
        )}
      </div>

      <div className="onb-slide" key={index}>
        <Art type={slide.art} />
        <h1 className="onb-title">{slide.title}</h1>
        <p className="onb-text">{slide.text}</p>
      </div>

      <div className="onb-bottom">
        <div className="onb-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={i === index ? 'active' : ''}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}-slayd`}
            />
          ))}
        </div>
        <button className="btn btn-primary btn-lg btn-block" onClick={next}>
          {last ? 'Boshlash 🚀' : 'Keyingi'}
        </button>
      </div>
    </div>
  );
}
