/* ==========================================================================
   Configurator — 입력 스키마 (데이터 레이어)
   필드 정의와 검증 규칙만 둔다. DOM이나 3D 로직을 참조하지 않는다.
   STL 생성 모듈이 기대하는 단위/키가 다르면 여기서만 바꾼다.
   ========================================================================== */
(function (Moss) {
  Moss.configuratorSchema = {
    unit: 'cm',
    decimals: 1,

    fields: [
      {
        key: 'width',
        label: '설치 가능한 공간 가로',
        min: 0, minExclusive: true,
        messages: {
          required: '설치 가능한 공간의 가로 길이를 입력해주세요.',
          min: '가로 길이는 0보다 커야 해요.'
        }
      },
      {
        key: 'height',
        label: '설치 가능한 공간 세로',
        min: 0, minExclusive: true,
        messages: {
          required: '설치 가능한 공간의 세로 길이를 입력해주세요.',
          min: '세로 길이는 0보다 커야 해요.'
        }
      },
      {
        key: 'backGap',
        label: '세면대 뒤쪽 여유 공간',
        min: 2, allowZero: true,
        messages: {
          required: '세면대 뒤쪽 여유 공간을 입력해주세요.',
          min: '세면대로부터 최소 2cm는 띄워주세요. 공간이 없는 경우 0으로 입력해주세요.'
        }
      },
      {
        key: 'sideGap',
        label: '세면대 옆쪽 여유 공간',
        min: 2,
        messages: {
          required: '세면대 옆쪽 여유 공간을 입력해주세요.',
          min: '세면대로부터 최소 2cm는 띄워주세요.'
        }
      }
    ],

    // 여러 필드를 함께 보는 규칙 (target 필드에 오류 표시)
    rules: [
      {
        target: 'backGap',
        needs: ['backGap', 'height'],
        test: function (v) { return v.backGap < v.height; },
        message: '뒤쪽 여유 공간은 세로 길이보다 작아야 해요.'
      },
      {
        target: 'sideGap',
        needs: ['sideGap', 'width'],
        test: function (v) { return v.sideGap < v.width; },
        message: '옆쪽 여유 공간은 가로 길이보다 작아야 해요.'
      }
    ]
  };
})(window.Moss = window.Moss || {});
