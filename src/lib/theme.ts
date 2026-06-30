export const T = {
  // Fondos
  bg:         '#F5F7F8',
  white:      '#FFFFFF',
  card:       '#FFFFFF',
  border:     '#E8ECEF',
  borderHi:   '#D1D5DB',

  // Texto
  text:       '#1A1A2E',
  textSub:    '#6B7280',
  muted:      '#9CA3AF',

  // Acento principal
  accent:     '#04dedf',
  accentDim:  '#E0FFFE',
  accentText: '#047a7a',
  accentDark: '#04aeaf',

  // Semánticos
  green:      '#10B981',
  greenDim:   '#ECFDF5',
  greenText:  '#065F46',

  red:        '#EF4444',
  redDim:     '#FEF2F2',
  redText:    '#991B1B',

  warm:       '#F59E0B',
  warmDim:    '#FFFBEB',
  warmText:   '#92400E',

  blue:       '#3B82F6',
  blueDim:    '#EFF6FF',
  blueText:   '#1E40AF',

  purple:     '#8B5CF6',
  purpleDim:  '#F5F3FF',
  purpleText: '#5B21B6',

  // Nav
  navBg:      '#FFFFFF',
  navBorder:  '#E8ECEF',
}

export const tempColor = (t: string) =>
  t === 'hot' ? T.red : t === 'warm' ? T.warm : T.blue

export const tempDim = (t: string) =>
  t === 'hot' ? T.redDim : t === 'warm' ? T.warmDim : T.blueDim

export const tempTextColor = (t: string) =>
  t === 'hot' ? T.redText : t === 'warm' ? T.warmText : T.blueText

export const tempLabel = (t: string) =>
  t === 'hot' ? 'Hot' : t === 'warm' ? 'Warm' : 'Cold'