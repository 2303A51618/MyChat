import React from 'react';

const EMOJIS = ['👍','❤️','😂','😮','😢','👏','🎉','🔥','😆','😡','🤝','🤩','😇'];

const EmojiPicker = ({ onSelect }) => {
  return (
    <div className="bg-white border rounded shadow p-2 grid grid-cols-6 gap-2">
      {EMOJIS.map(e => (
        <button type="button" key={e} onClick={() => onSelect(e)} className="text-2xl px-1 py-1 hover:bg-gray-100 rounded">{e}</button>
      ))}
    </div>
  );
};

export default EmojiPicker;
