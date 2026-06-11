// Справочник полей анкеты — источник для рендера письма и подсчёта заполненности.
// Структура и имена сверены с fields_reference.json; подписи опций — с careers_analyst_form.html.

export const VOICE_FIELDS = [
  'last_trade', 'idea_sources', 'explain_stoploss', 'respected_analysts',
  'known_signals_services', 'strong_side', 'weak_side', 'worst_streak',
  'blew_account', 'trader_community', 'public_channels', 'motivation',
  'six_month_plan', 'compensation', 'anything_else', 'questions',
];

// Главы и поля по порядку. type: text | textarea | number | url | radio | multi | voice
export const CHAPTERS = [
  { id: 1, title: 'Контакты', fields: [
    { name: 'name', label: 'Имя и фамилия', type: 'text' },
    { name: 'age', label: 'Возраст', type: 'number' },
    { name: 'telegram', label: 'Telegram', type: 'text' },
    { name: 'city', label: 'Город', type: 'text' },
  ]},
  { id: 2, title: 'Реальность торговли', fields: [
    { name: 'start_year', label: 'Когда начал активно торговать', type: 'text' },
    { name: 'brokers', label: 'Брокеры (текущие)', type: 'text' },
    { name: 'previous_brokers', label: 'Брокеры (прошлые)', type: 'textarea' },
    { name: 'instruments', label: 'Инструменты', type: 'multi' },
    { name: 'last_trade', label: 'Опишите сделку этой недели', type: 'voice' },
    { name: 'trades_per_week', label: 'Сделок в неделю', type: 'radio' },
    { name: 'position_sizing', label: 'Объём позиции', type: 'text' },
    { name: 'dangerous_strategies', label: 'Опасные стратегии (мартингейл, усреднение)', type: 'radio' },
    { name: 'max_drawdown', label: 'Max просадка за год', type: 'radio' },
  ]},
  { id: 3, title: 'Методология', fields: [
    { name: 'approach', label: 'Подход', type: 'radio' },
    { name: 'realistic_winrate', label: 'Реалистичный winrate', type: 'radio' },
    { name: 'my_winrate', label: 'Мой winrate', type: 'radio' },
    { name: 'idea_sources', label: 'Источники идей', type: 'voice' },
    { name: 'explain_stoploss', label: 'Объясните стоп-лосс новичку', type: 'voice' },
    { name: 'respected_analysts', label: 'Уважаемые публичные аналитики', type: 'voice' },
    { name: 'known_signals_services', label: 'Знание signals-сервисов', type: 'voice' },
  ]},
  { id: 4, title: 'Психология', fields: [
    { name: 'strong_side', label: 'Сильная сторона', type: 'voice' },
    { name: 'weak_side', label: 'В чём вы плохой трейдер', type: 'voice' },
    { name: 'worst_streak', label: 'Худшая серия проигрышей', type: 'voice' },
    { name: 'blew_account', label: 'Опыт слива депозита', type: 'voice' },
    { name: 'trader_community', label: 'Коллеги-трейдеры', type: 'voice' },
  ]},
  { id: 5, title: 'Шкура на кону', fields: [
    { name: 'account_size', label: 'Размер счёта', type: 'radio' },
    { name: 'yearly_return', label: 'Годовая доходность', type: 'radio' },
    { name: 'income_type', label: 'Тип дохода от трейдинга', type: 'radio' },
    { name: 'track_record', label: 'Public track record', type: 'url' },
    { name: 'public_channels', label: 'Публичные каналы по трейдингу', type: 'voice' },
    { name: 'has_prop', label: 'Funded prop-аккаунт?', type: 'radio' },
    { name: 'prop_details', label: 'Детали prop-аккаунта', type: 'textarea' },
    { name: 'has_industry', label: 'Опыт в брокере / прайм-фирме', type: 'radio' },
    { name: 'industry_details', label: 'Детали опыта в индустрии', type: 'textarea' },
  ]},
  { id: 6, title: 'Готовность и формальности', fields: [
    { name: 'hours', label: 'Часов в день', type: 'radio' },
    { name: 'employment', label: 'Текущая занятость', type: 'radio' },
    { name: 'english', label: 'Английский', type: 'radio' },
    { name: 'algo_skills', label: 'Python / Pine Script / алго', type: 'radio' },
    { name: 'crypto_exp', label: 'Опыт с криптой и DEX', type: 'radio' },
    { name: 'remote_exp', label: 'Опыт в распределённой команде', type: 'radio' },
    { name: 'ready_review', label: 'Готов к редактуре материалов', type: 'radio' },
    { name: 'ready_ghost', label: 'Готов работать ghost', type: 'radio' },
    { name: 'ready_nda', label: 'Готов к NDA + non-compete', type: 'radio' },
    { name: 'ready_show_stats', label: 'Готов показать статистику', type: 'radio' },
    { name: 'test_period', label: 'Готов к 2-недельному тестовому', type: 'radio' },
  ]},
  { id: 7, title: 'Мотивация и финал', fields: [
    { name: 'motivation', label: 'Приоритеты (деньги / формат / рост)', type: 'voice' },
    { name: 'six_month_plan', label: 'План на 6 месяцев', type: 'voice' },
    { name: 'compensation', label: 'Приемлемые условия', type: 'voice' },
    { name: 'anything_else', label: 'Что не спросили', type: 'voice' },
    { name: 'questions', label: 'Вопросы к нам', type: 'voice' },
  ]},
];

// Человекочитаемые подписи значений radio/checkbox (коды → текст, как на фронте).
export const OPTION_LABELS = {
  trades_per_week: { lt5: '< 5', '5_15': '5-15', '15_40': '15-40', gt40: '40+' },
  dangerous_strategies: { never: 'Никогда', sometimes: 'Иногда', regular: 'Регулярно' },
  max_drawdown: { lt10: '< 10%', '10_25': '10-25%', '25_50': '25-50%', gt50: '> 50%', not_track: 'Не знаю' },
  approach: { technical: 'Технический', fundamental: 'Фундамент.', mixed: 'Смешанный', algo: 'Алго' },
  realistic_winrate: { lt50: '< 50%', '50_65': '50-65%', '65_80': '65-80%', gt80: '> 80%' },
  my_winrate: { lt50: '< 50%', '50_65': '50-65%', '65_80': '65-80%', gt80: '> 80%' },
  account_size: { lt1k: 'До $1K', '1_5k': '$1K-5K', '5_20k': '$5K-20K', gt20k: '$20K+' },
  yearly_return: { loss: 'Убыток', '0_20': '0-20%', '20_50': '20-50%', '50_100': '50-100%', gt100: '> 100%' },
  income_type: { primary: 'Основной', secondary: 'Дополнительный', no_stable: 'Пока нестабильно' },
  has_prop: { yes: 'Да', no: 'Нет' },
  has_industry: { yes: 'Да, работал', no: 'Нет' },
  hours: { lt2: 'До 2 ч', '2_4': '2-4 ч', '4_8': '4-8 ч', ft: '8+ ч (full-time)' },
  employment: { ft: 'Фул-тайм', self: 'Самозанятый' },
  english: { no: 'Не владею', a1_b1: 'A1-B1', b2_c1: 'B2-C1', native: 'C2 / Native' },
  algo_skills: { no: 'Нет опыта', basic: 'Базово', advanced: 'Уверенно' },
  crypto_exp: { no: 'Нет опыта', cex: 'CEX-биржи', onchain: 'DEX / DeFi' },
  remote_exp: { no: 'Нет', some: 'Был раньше', constant: 'Постоянно' },
  ready_review: { yes: 'Да', conditional: 'Зависит', no: 'Нет' },
  ready_ghost: { yes: 'Да', conditional: 'Зависит', no: 'Нет' },
  ready_nda: { yes: 'Да', conditional: 'Зависит', no: 'Нет' },
  ready_show_stats: { yes: 'Да', conditional: 'Зависит', no: 'Нет' },
  test_period: { yes: 'Да', conditional: 'Зависит', no: 'Нет' },
  instruments: {
    fx_majors: 'FX-majors', fx_crosses: 'FX-кроссы', xau: 'Золото (XAU/USD)',
    xag: 'Серебро / металлы', indices: 'Индексы', crypto: 'Криптовалюты',
    oil: 'Нефть / commodities', stocks: 'Акции / CFD', other: 'Другое',
  },
};

// Подпись значения с учётом карты опций (для radio/multi). Возвращает читаемый текст.
export function optionLabel(field, value) {
  const map = OPTION_LABELS[field];
  if (!map) return value;
  return map[value] || value;
}
