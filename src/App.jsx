'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { createPixOrder } from './services/pixOrdersApi.js';
import OrganizerRoutes from './OrganizerApp.jsx';

const demoRaffles = [
  {
    id: 'relogio',
    image: '/images/watch.avif',
    imageAlt: 'Relógio premium com pulseira em aço',
    organizer: 'Carlos Mendes',
    title: 'Relógio Premium Classic',
    description: 'Um clássico atemporal em aço inoxidável, vidro de safira e movimento automático. Novo, original e com garantia.',
    prizeValue: '1.000,00',
    price: '10,00',
    numbers: '100',
    drawingDate: '28 Jun, 2025',
    drawingDateLong: '28 de junho, 2025',
    sold: 30,
    cardSold: 65,
    reserved: 13,
    confirmed: 17,
  },
  {
    id: 'headphone',
    image: '/images/headphones.avif',
    imageAlt: 'Headphone preto de alta qualidade',
    organizer: 'Marina Alves',
    title: 'Headphone Air Pro Max',
    description: 'Uma oportunidade de concorrer ao Headphone Air Pro Max. Confira o andamento da rifa e escolha seus números da sorte.',
    prizeValue: 'A confirmar',
    price: '15,00',
    numbers: '150',
    drawingDate: '05 Jul, 2025',
    drawingDateLong: '05 de julho, 2025',
    sold: 48,
    reserved: 18,
    confirmed: 54,
  },
  {
    id: 'smartphone',
    image: '/images/smartphone.avif',
    imageAlt: 'Smartphone premium em tom laranja',
    organizer: 'André Ribeiro',
    title: 'Smartphone Pro 256 GB',
    description: 'Uma oportunidade de concorrer ao Smartphone Pro 256 GB. Confira o andamento da rifa e escolha seus números da sorte.',
    prizeValue: 'A confirmar',
    price: '25,00',
    numbers: '200',
    drawingDate: '12 Jul, 2025',
    drawingDateLong: '12 de julho, 2025',
    sold: 72,
    reserved: 30,
    confirmed: 114,
  },
];

const steps = [
  {
    number: '01',
    title: 'Escolha sua rifa',
    description: 'Explore prêmios incríveis e encontre sua próxima conquista.',
    icon: 'search',
  },
  {
    number: '02',
    title: 'Selecione os números',
    description: 'Escolha quantos números quiser e veja o valor em tempo real.',
    icon: 'grid',
  },
  {
    number: '03',
    title: 'Pague com Pix',
    description: 'Pagamento rápido e confirmação automática e segura.',
    icon: 'check',
  },
];

function Icon({ name, size = 20, className = '' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className,
  };

  if (name === 'ticket') {
    return (
      <svg {...common}>
        <path d="M2 9a3 3 0 0 0 0 6v3h20v-3a3 3 0 0 0 0-6V6H2v3Z" />
        <path d="M13 6v12" />
      </svg>
    );
  }
  if (name === 'shield') {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (name === 'eye') {
    return (
      <svg {...common}>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }
  if (name === 'grid') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (name === 'check') {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }
  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }
  if (name === 'arrow') {
    return (
      <svg {...common}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    );
  }
  if (name === 'menu') {
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  }
  return null;
}

function Brand({ light = false }) {
  return (
    <a className={`brand${light ? ' brand--light' : ''}`} href="/" aria-label="RIFOU, página inicial">
      <span className="brand__mark"><Icon name="ticket" size={21} /></span>
      <span className="brand__word">RIFOU</span>
    </a>
  );
}

function Progress({ value, compact = false }) {
  return (
    <div className={`progress${compact ? ' progress--compact' : ''}`}>
      <div className="progress__labels">
        <strong>{value}% arrecadado</strong>
        <span>{100 - value}% restante</span>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-label={`${value}% arrecadado`}
        aria-valuenow={value}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function RaffleCard({ raffle }) {
  const detailUrl = `/rifas/${raffle.id}`;

  return (
    <article className="raffle-card">
      <a className="raffle-card__image-wrap" href={detailUrl} aria-label={`Ver detalhes: ${raffle.title}`}>
        <img src={raffle.image} alt={raffle.imageAlt} className="raffle-card__image" />
        <span className="raffle-card__badge">{raffle.status === 'DRAWN' ? 'Sorteada' : 'Ativa'}</span>
      </a>
      <div className="raffle-card__body">
        <p className="raffle-card__organizer">{raffle.organizer}</p>
        <h3><a href={detailUrl}>{raffle.title}</a></h3>
        <div className="raffle-card__details">
          <div>
            <span>Por número</span>
            <strong>R$ {raffle.price}</strong>
          </div>
          <div>
            <span>Números</span>
            <strong>{raffle.numbers}</strong>
          </div>
          <div>
            <span>Sorteio</span>
            <strong>{raffle.drawingDate}</strong>
          </div>
        </div>
        <Progress value={raffle.cardSold ?? raffle.sold} compact />
        <a className="button button--full" href={detailUrl}>
          Ver rifa <Icon name="arrow" size={18} />
        </a>
      </div>
    </article>
  );
}

function formatDrawDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function DrawnRaffleCard({ raffle }) {
  const numberWidth = String(raffle.numbers || 1).length;
  const drawResult = raffle.drawResult || {};
  return <article className="raffle-history-card">
    <a href={`/rifas/${raffle.id}`} className="raffle-history-card__image" aria-label={`Ver resultado: ${raffle.title}`}>
      <img src={raffle.image} alt={raffle.imageAlt || raffle.title} />
      <span>Rifa sorteada</span>
    </a>
    <div className="raffle-history-card__body">
      <p className="section-kicker">Sorteio realizado</p>
      <h3><a href={`/rifas/${raffle.id}`}>{raffle.title}</a></h3>
      <div className="raffle-history-card__result"><span>Número sorteado</span><strong>{String(drawResult.number || 0).padStart(numberWidth, '0')}</strong></div>
      <p className="raffle-history-card__winner">Ganhador: <strong>{drawResult.winnerName || 'Participante'}</strong></p>
      <small>{formatDrawDateTime(drawResult.drawnAt)}</small>
      <a className="text-link raffle-history-card__link" href={`/rifas/${raffle.id}`}>Ver resultado <Icon name="arrow" size={16} /></a>
    </div>
  </article>;
}

function DrawnRafflesSection({ raffles, compact = false }) {
  if (!raffles.length) return null;
  return <section id="rifas-sorteadas" className={`raffle-history-section section${compact ? ' raffle-history-section--compact' : ''}`}>
    <div className="container">
      <div className="section-heading section-heading--row"><div><p className="section-kicker">Transparência RIFOU</p><h2>Rifas já sorteadas</h2><p>Confira os resultados dos sorteios realizados.</p></div>{compact && <a className="section-heading__link" href="/rifas#rifas-sorteadas">Ver todo o histórico <Icon name="arrow" size={16} /></a>}</div>
      <div className="raffle-history-grid">{raffles.map((raffle) => <DrawnRaffleCard key={raffle.id} raffle={raffle} />)}</div>
    </div>
  </section>;
}

function Header({ menuOpen, setMenuOpen }) {
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="container header__inner">
        <Brand />
        <button
          className="header__menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Icon name="menu" size={22} />
        </button>
        <nav className={`main-nav${menuOpen ? ' main-nav--open' : ''}`} aria-label="Navegação principal">
          <a href="/" onClick={closeMenu}>Início</a>
          <a href="/rifas" onClick={closeMenu}>Ver rifas</a>
          <a href="/consultar-compra" onClick={closeMenu}>Consultar compra</a>
          <a href="/#como-funciona" onClick={closeMenu}>Como funciona</a>
          <a className="main-nav__login" href="/organizador/login" onClick={closeMenu}>Entrar</a>
          <a className="button button--small" href="/rifas" onClick={closeMenu}>Ver rifas</a>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter({ showNotice }) {
  return (
    <footer className="site-footer" id="contato">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand light />
            <p>Rifas transparentes, participações simples e momentos inesquecíveis.</p>
          </div>
          <div className="footer-column">
            <h2>Plataforma</h2>
            <a href="/rifas">Ver rifas</a>
            <a href="/consultar-compra">Consultar compra</a>
            <a href="/#como-funciona">Como funciona</a>
            <button type="button" onClick={() => showNotice('Mais informações sobre segurança em breve.')}>Segurança</button>
          </div>
          <div className="footer-column">
            <h2>Organizadores</h2>
            <a href="/organizador/login">Entrar</a>
            <a href="/organizador/solicitar-acesso">Quero organizar</a>
            <a href="mailto:suporte@rifou.com.br">Central de ajuda</a>
          </div>
          <div className="footer-column footer-column--contact">
            <h2>Fale com a gente</h2>
            <a href="mailto:suporte@rifou.com.br">suporte@rifou.com.br</a>
            <p>Seg–Sex, 9h às 18h</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} RIFOU. Todos os direitos reservados.</p>
          <div>
            <button type="button" onClick={() => showNotice('Os termos de uso serão publicados em breve.')}>Termos de uso</button>
            <span>·</span>
            <button type="button" onClick={() => showNotice('A política de privacidade será publicada em breve.')}>Privacidade</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function RafflesPage({ raffles, drawnRaffles }) {
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const visibleRaffles = normalizedSearch
    ? raffles.filter((raffle) => [raffle.title, raffle.organizer, raffle.description, raffle.prizeValue]
      .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch)))
    : raffles;
  const visibleDrawnRaffles = normalizedSearch
    ? drawnRaffles.filter((raffle) => [raffle.title, raffle.organizer, raffle.description, raffle.drawResult?.winnerName]
      .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch)))
    : drawnRaffles;
  return (
    <main className="catalog-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Navegação estrutural">
          <a href="/">Início</a><Icon name="arrow" size={14} /><span>Ver rifas</span>
        </nav>
        <section className="catalog-heading">
          <div>
            <p className="section-kicker">Oportunidades RIFOU</p>
            <h1>Ver rifas</h1>
            <p>Pesquise campanhas, escolha seus números e acompanhe os resultados com transparência.</p>
          </div>
          <label className="catalog-search"><Icon name="search" size={18} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por rifa ou organizador" aria-label="Buscar rifas" /></label>
          <span className="catalog-heading__count">{visibleRaffles.length} rifas disponíveis</span>
        </section>
        {visibleRaffles.length ? (
          <div className="raffle-grid">
            {visibleRaffles.map((raffle) => <RaffleCard key={raffle.id} raffle={raffle} />)}
          </div>
        ) : (
          <p className="raffles-empty">{normalizedSearch ? 'Nenhuma rifa corresponde à sua busca.' : 'Não há rifas ativas no momento. Volte em breve para conferir novas oportunidades.'}</p>
        )}
      </div>
      <DrawnRafflesSection raffles={visibleDrawnRaffles} />
    </main>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatBrazilPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  const subscriberSplit = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, subscriberSplit)}-${digits.slice(subscriberSplit)}`;
}

function CheckoutProgress({ activeStep }) {
  const steps = ['Escolha', 'Identificação', 'Pagamento'];

  return (
    <nav className="checkout-progress" aria-label="Etapas da participação">
      {steps.map((label, index) => {
        const step = index + 1;
        const complete = step < activeStep;
        const active = step === activeStep;
        return (
          <div className={`checkout-progress__step${active ? ' checkout-progress__step--active' : ''}${complete ? ' checkout-progress__step--complete' : ''}`} key={label} aria-current={active ? 'step' : undefined}>
            <span>{complete ? <Icon name="check" size={13} /> : step}</span>
            <strong>{label}</strong>
          </div>
        );
      })}
    </nav>
  );
}

function ParticipationSummary({ raffle, selectedNumbers, total }) {
  const orderedNumbers = [...selectedNumbers].sort((first, second) => first - second);

  return (
    <aside className="participation-summary">
      <h2>Resumo da participação</h2>
      <div className="participation-summary__raffle">
        <img src={raffle.image} alt="" />
        <div><strong>{raffle.title}</strong><span>por {raffle.organizer}</span></div>
      </div>
      <div className="participation-summary__numbers-heading"><span>Números escolhidos</span><strong>{orderedNumbers.length}</strong></div>
      <div className="participation-summary__number-list">
        {orderedNumbers.map((number) => <span key={number}>{String(number).padStart(2, '0')}</span>)}
      </div>
      <div className="participation-summary__unit"><span>Valor por número</span><strong>R$ {raffle.price}</strong></div>
      <div className="participation-summary__total"><span>Total a pagar</span><strong>{formatCurrency(total)}</strong></div>
    </aside>
  );
}

function RaffleDetailsPage({ raffle, showNotice }) {
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [raffleNumbers, setRaffleNumbers] = useState({});
  const lastLoadedNumbersPage = useRef(null);
  const [numberSummary, setNumberSummary] = useState(null);
  const [numberRequest, setNumberRequest] = useState({ status: 'loading' });
  const [numberRetryKey, setNumberRetryKey] = useState(0);
  const [checkoutStep, setCheckoutStep] = useState('details');
  const [customerName, setCustomerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [formError, setFormError] = useState('');
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixOrder, setPixOrder] = useState(null);
  const autoDownloadedPurchaseCode = useRef('');
  const [copyMessage, setCopyMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const totalNumbers = Number(raffle.numbers);
  const maxNumbersPerUser = Number(raffle.maxNumbersPerUser || Math.min(97, totalNumbers));
  const pageSize = 30;
  const pageCount = Math.ceil(totalNumbers / pageSize);
  const firstNumber = currentPage * pageSize + 1;
  const lastNumber = Math.min(firstNumber + pageSize - 1, totalNumbers);
  const visibleNumbers = Array.from({ length: lastNumber - firstNumber + 1 }, (_, index) => firstNumber + index);
  const numberStatuses = raffleNumbers;
  const numberStatusCounts = {
    available: Number(numberSummary?.availableCount || 0),
    reserved: Number(numberSummary?.reservedCount || 0),
    confirmed: Number(numberSummary?.confirmedCount || 0),
  };
  const availableNumbers = numberStatusCounts.available;
  const price = Number(raffle.price.replace(',', '.'));
  const totalValue = totalNumbers * price;
  const raisedValue = Number(raffle.confirmed || 0) * price;
  const leftToRaise = totalValue - raisedValue;
  const selectedNumbersValue = selectedNumbers.length * price;
  const organizerInitials = raffle.organizer.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase();
  const remainingSeconds = pixOrder ? Math.max(0, Math.ceil((pixOrder.expiresAt - now) / 1000)) : 0;
  const countdownLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (checkoutStep !== 'pix' || !pixOrder) return undefined;

    const updateCountdown = () => setNow(Date.now());
    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [checkoutStep, pixOrder]);

  useEffect(() => {
    if (checkoutStep !== 'pix' || !pixOrder?.purchaseCode || remainingSeconds <= 0
      || autoDownloadedPurchaseCode.current === pixOrder.purchaseCode) return undefined;
    autoDownloadedPurchaseCode.current = pixOrder.purchaseCode;
    window.setTimeout(() => {
      savePurchaseReceiptPdf(pixOrder, raffle).catch(() => showNotice('O navegador não permitiu o download automático. Use “Baixar comprovante em PDF”.'));
    }, 0);
    return undefined;
  }, [checkoutStep, pixOrder, raffle, remainingSeconds]);

  useEffect(() => {
    if (raffle.status !== 'ACTIVE') return undefined;
    const controller = new AbortController();
    const loadNumbers = async () => {
      const from = currentPage * pageSize + 1;
      const limit = Math.min(pageSize, totalNumbers - from + 1);
      const pageKey = `${raffle.id}:${currentPage}`;
      const sameLoadedPage = lastLoadedNumbersPage.current === pageKey;
      setNumberRequest((current) => current.status === 'ready' && sameLoadedPage
        ? { ...current, refreshing: true, refreshError: false }
        : { status: 'loading' });
      try {
        const response = await fetch(`/api/raffles/${encodeURIComponent(raffle.id)}/numbers?from=${from}&limit=${limit}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Falha ao buscar os números.');
        if (!Array.isArray(payload.items) || payload.items.length !== limit) {
          throw new Error('A resposta de disponibilidade dos números está incompleta.');
        }

        const pageStatuses = {};
        payload.items.forEach((item) => {
          const number = Number(item.number);
          const status = String(item.status || '').toLowerCase();
          if (!Number.isInteger(number) || number < from || number > from + limit - 1
            || !['available', 'reserved', 'confirmed'].includes(status)) {
            throw new Error('A resposta de disponibilidade dos números é inválida.');
          }
          pageStatuses[number] = status;
        });
        setRaffleNumbers((current) => ({ ...current, ...pageStatuses }));
        setNumberSummary({
          availableCount: payload.availableCount,
          reservedCount: payload.reservedCount,
          confirmedCount: payload.confirmedCount,
        });
        setSelectedNumbers((current) => current.filter((number) => (
          number < from || number > from + limit - 1 || pageStatuses[number] === 'available'
        )));
        lastLoadedNumbersPage.current = pageKey;
        setNumberRequest({ status: 'ready', refreshing: false, refreshError: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Não foi possível carregar os números da rifa.', error);
        setNumberRequest((current) => current.status === 'ready' && sameLoadedPage
          ? { ...current, refreshing: false, refreshError: true }
          : { status: 'error' });
      }
    };

    loadNumbers();
    return () => controller.abort();
  }, [raffle.id, raffle.status, currentPage, totalNumbers, pageSize, numberRetryKey]);

  useEffect(() => {
    if (checkoutStep !== 'details' || raffle.status !== 'ACTIVE') return undefined;
    const refreshAvailability = () => {
      if (document.visibilityState === 'visible') setNumberRetryKey((current) => current + 1);
    };
    const interval = window.setInterval(refreshAvailability, 10_000);
    document.addEventListener('visibilitychange', refreshAvailability);
    window.addEventListener('focus', refreshAvailability);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshAvailability);
      window.removeEventListener('focus', refreshAvailability);
    };
  }, [checkoutStep, raffle.id, raffle.status]);

  const toggleNumber = (number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers((current) => current.filter((selected) => selected !== number));
      return;
    }
    if (selectedNumbers.length >= Math.min(97, maxNumbersPerUser)) {
      showNotice(`O limite desta rifa é de ${maxNumbersPerUser} números por telefone, incluindo reservas e compras anteriores.`);
      return;
    }
    setSelectedNumbers((current) => [...current, number].sort((a, b) => a - b));
  };

  const generatePix = async (event) => {
    event.preventDefault();
    setFormError('');

    if (customerName.trim().length < 3) {
      setFormError('Informe seu nome completo para continuar.');
      return;
    }
    const phoneDigits = whatsapp.replace(/\D/g, '');
    if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      setFormError('Informe um WhatsApp com DDD e 10 ou 11 dígitos.');
      return;
    }

    setIsGeneratingPix(true);
    try {
      const order = await createPixOrder({
        raffleId: raffle.id,
        name: customerName.trim(),
        phone: phoneDigits,
        numbers: selectedNumbers,
      });
      setPixOrder(order);
      setNow(Date.now());
      setCopyMessage('');
      setCheckoutStep('pix');
    } catch (error) {
      if (error?.code === 'USER_LIMIT_REACHED') {
        setCheckoutStep('details');
        showNotice(error.message);
      } else if (error?.code === 'PIX_NOT_CONFIGURED') {
        setFormError(error.message || 'O organizador ainda não configurou uma chave Pix.');
      } else if (error?.status === 409) {
        setCheckoutStep('details');
        setSelectedNumbers([]);
        setCurrentPage(0);
        setNumberRetryKey((current) => current + 1);
        showNotice('Um ou mais números foram reservados. Confira a disponibilidade e selecione novamente.');
      } else {
        setFormError(error instanceof Error ? error.message : 'Não foi possível gerar o Pix.');
      }
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const copyPixCode = async () => {
    if (!pixOrder) return;
    try {
      await navigator.clipboard.writeText(pixOrder.copyPasteCode);
      setCopyMessage('Código Pix copiado.');
    } catch {
      setCopyMessage('Não foi possível copiar automaticamente. Selecione o código acima e copie manualmente.');
    }
  };

  const copyPurchaseCode = async () => {
    if (!pixOrder?.purchaseCode) return;
    try { await navigator.clipboard.writeText(pixOrder.purchaseCode); setCopyMessage('Código da compra copiado.'); }
    catch { setCopyMessage('Não foi possível copiar automaticamente. Selecione o código da compra e copie.'); }
  };

  if (checkoutStep === 'identification') {
    return (
      <main className="checkout-page">
        <div className="container checkout-page__container">
          <div className="checkout-page__top">
            <button className="checkout-back" type="button" onClick={() => { setCheckoutStep('details'); setFormError(''); }}>
              <Icon name="arrow" size={16} className="checkout-back__icon" /> Voltar à escolha
            </button>
            <CheckoutProgress activeStep={2} />
          </div>
          <div className="checkout-layout">
            <section className="checkout-card checkout-form-card">
              <p className="section-kicker">Quase lá</p>
              <h1>Como podemos identificar você?</h1>
              <p className="checkout-form-card__intro">Sem cadastro ou senha. Informe seu nome e WhatsApp para vincular esta participação.</p>
              <form className="checkout-form" onSubmit={generatePix} noValidate>
                <div className="form-field">
                  <label htmlFor="customer-name">Nome completo</label>
                  <input
                    id="customer-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="customer-whatsapp">WhatsApp com DDD</label>
                  <div className="phone-input">
                    <span>+55</span>
                    <input
                      id="customer-whatsapp"
                      name="telephone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="(11) 99999-9999"
                      value={whatsapp}
                      onChange={(event) => setWhatsapp(formatBrazilPhone(event.target.value))}
                      required
                    />
                  </div>
                </div>
                <div className="checkout-privacy-note">
                  <span><Icon name="shield" size={18} /></span>
                  <div><strong>Dados usados nesta reserva</strong><small>Nome e WhatsApp serão associados à compra para identificar os números reservados.</small></div>
                </div>
                {formError && <p className="checkout-error" role="alert">{formError}</p>}
                <button className="button button--full checkout-form__submit" type="submit" disabled={isGeneratingPix}>
                  {isGeneratingPix ? 'Gerando Pix…' : 'Gerar Pix'} <Icon name="arrow" size={18} />
                </button>
              </form>
            </section>
            <ParticipationSummary raffle={raffle} selectedNumbers={selectedNumbers} total={selectedNumbersValue} />
          </div>
        </div>
      </main>
    );
  }

  if (checkoutStep === 'pix' && pixOrder) {
    return (
      <main className="checkout-page">
        <div className="container checkout-page__container">
          <div className="checkout-page__top checkout-page__top--payment">
            <a className="checkout-back" href={`/rifas/${raffle.id}`}>
              <Icon name="arrow" size={16} className="checkout-back__icon" /> Voltar para a rifa
            </a>
            <CheckoutProgress activeStep={3} />
          </div>
          <div className="checkout-layout checkout-layout--pix">
            <section className="checkout-card pix-card">
              <span className="pix-card__status"><Icon name="check" size={14} /> {pixOrder.isDemo ? 'Pix demonstrativo gerado' : 'QR Pix gerado'}</span>
              <h1>Seus números estão pré-reservados</h1>
              <p className="pix-card__intro">A reserva vale por 15 minutos. Pague dentro desse prazo; o valor vai diretamente para a chave Pix do organizador.</p>
              <p className="pix-card__intro">Código da compra: <strong>{pixOrder.purchaseCode}</strong></p>
              <button className="dashboard-period" type="button" onClick={copyPurchaseCode}>Copiar código da compra</button>
              <a className="text-link" href={`/consultar-compra?codigo=${encodeURIComponent(pixOrder.purchaseCode)}`}>Consultar esta compra</a>
              <div className={`reservation-timer${remainingSeconds === 0 ? ' reservation-timer--expired' : ''}`}>
                <span>{remainingSeconds === 0 ? 'Prazo da reserva encerrado' : 'Tempo restante da reserva'}</span>
                <strong>{countdownLabel}</strong>
              </div>
              {remainingSeconds > 0 ? (
                <div className="pix-card__qr">
                  <QRCodeSVG
                    value={pixOrder.copyPasteCode}
                    size={230}
                    level="M"
                    marginSize={4}
                    bgColor="#ffffff"
                    fgColor="#10251c"
                    title="QR code Pix"
                  />
                </div>
              ) : (
                <div className="pix-expired-note">A reserva expirou. Não pague este Pix: o QR estático pode continuar aceitando pagamentos, mas os números podem já estar disponíveis para outra pessoa.</div>
              )}
              {remainingSeconds > 0 && <div className="pix-copy-field">
                <label htmlFor="pix-copy-code">Pix copia e cola</label>
                <code id="pix-copy-code">{pixOrder.copyPasteCode}</code>
                <button className="button button--full" type="button" onClick={copyPixCode}>
                  {copyMessage.startsWith('Código Pix copiado') ? 'Código copiado' : 'Copiar código Pix'}
                </button>
                {copyMessage && <p className="pix-copy-field__message" role="status">{copyMessage}</p>}
              </div>}
              <button className="dashboard-period payment-save-button" type="button" onClick={() => savePurchaseReceiptPdf(pixOrder, raffle).catch(() => showNotice('Não foi possível gerar o comprovante em PDF neste navegador.'))}>Baixar comprovante em PDF</button>
              {pixOrder.isDemo
                ? <div className="pix-payment-warning"><strong>Simulação — não é uma cobrança válida.</strong><span>Este QR code e o código copia e cola são fictícios. Nenhum pagamento é enviado ou confirmado.</span></div>
                : <div className="pix-payment-warning"><strong>Confirmação manual do pagamento.</strong><span>O Pix é estático e pode continuar aceitando pagamentos depois do prazo. Não pague após a reserva expirar. O pagamento não é confirmado automaticamente; o organizador analisará o comprovante ou confirmará a transação no painel.</span></div>}
            </section>
            <ParticipationSummary raffle={raffle} selectedNumbers={selectedNumbers} total={pixOrder.amountInCents / 100} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="detail-page">
      <div className="container detail-page__container">
        <nav className="breadcrumbs" aria-label="Navegação estrutural">
          <a href="/">Início</a><Icon name="arrow" size={14} /><a href="/rifas">Rifas</a><Icon name="arrow" size={14} /><span>{raffle.title}</span>
        </nav>

        <div className="detail-top-grid">
          <section className="detail-overview">
            <div className="detail-overview__image-wrap">
              <img src={raffle.image} alt={raffle.imageAlt} className="detail-overview__image" />
            </div>
            <div className="detail-overview__content">
              <span className={`detail-status${raffle.status === 'DRAWN' ? ' detail-status--drawn' : ''}`}><span /> {raffle.status === 'DRAWN' ? 'Sorteio realizado' : 'Rifa ativa'}</span>
              <h1>{raffle.title}</h1>
              <p className="detail-overview__description">{raffle.description}</p>
              <div className="detail-organizer">
                <span className="detail-organizer__avatar">{organizerInitials}</span>
                <span><small>Organizado por</small><strong>{raffle.organizer}</strong></span>
                <Icon name="shield" size={17} />
              </div>
              {raffle.organizerProfile?.publicId && <a className="detail-organizer-profile" href={`/organizadores/${encodeURIComponent(raffle.organizerProfile.publicId)}`}>
                <span className="detail-organizer-profile__logo">{raffle.organizerProfile.logoUrl
                  ? <img src={raffle.organizerProfile.logoUrl} alt={`Logo de ${raffle.organizerProfile.publicName}`} />
                  : raffle.organizerProfile.publicName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                <span><small>Perfil público</small><strong>{raffle.organizerProfile.publicName}</strong>{raffle.organizerProfile.message && <small>{raffle.organizerProfile.message}</small>}</span>
                <span className="detail-organizer-profile__link">Ver perfil <Icon name="arrow" size={15} /></span>
              </a>}
              <div className="detail-facts">
                <div><Icon name="ticket" size={20} /><span><small>Valor do prêmio</small><strong>{raffle.prizeValue === 'A confirmar' ? raffle.prizeValue : `R$ ${raffle.prizeValue}`}</strong></span></div>
                <div><Icon name="calendar" size={20} /><span><small>Data do sorteio</small><strong>{raffle.drawingDateLong}</strong></span></div>
              </div>
            </div>
          </section>

          <section className="detail-summary">
            <p className="section-kicker">Resumo da rifa</p>
            <div className="detail-summary__top">
              <div className="detail-summary__unit">
                <span>Cada número por</span>
                <strong>{formatCurrency(price)}</strong>
              </div>
              <div className="detail-summary__progress"><Progress value={raffle.sold} /></div>
            </div>
            <div className="detail-summary__metrics">
              <div><span>Valor total</span><strong>{formatCurrency(totalValue)}</strong></div>
              <div><span>Já arrecadado</span><strong>{formatCurrency(raisedValue)}</strong></div>
              <div><span>Falta arrecadar</span><strong>{formatCurrency(leftToRaise)}</strong></div>
              <div><span>Total de números</span><strong>{totalNumbers}</strong></div>
            </div>
            <div className="detail-safe">
              <span><Icon name="shield" size={20} /></span>
              <div><strong>Pagamento por Pix</strong><small>O valor vai para a chave Pix do organizador. A confirmação é manual.</small></div>
            </div>
          </section>
        </div>

        {raffle.status === 'DRAWN' && raffle.drawResult && <section className="public-draw-result" aria-label="Resultado do sorteio">
          <div className="public-draw-result__heading"><span className="section-kicker">Sorteio realizado com sucesso</span><h2>Temos um ganhador!</h2><p>O resultado desta rifa foi registrado e pode ser conferido abaixo.</p></div>
          <div className="public-draw-result__details"><div><span>Número sorteado</span><strong>{String(raffle.drawResult.number).padStart(String(totalNumbers).length, '0')}</strong></div><div><span>Ganhador</span><strong>{raffle.drawResult.winnerName}</strong></div><div><span>Data e hora</span><strong>{formatDrawDateTime(raffle.drawResult.drawnAt)}</strong></div></div>
        </section>}

        {raffle.status === 'ACTIVE' ? <section className="number-section" id="selecionar-numeros">
          <div className="number-section__heading">
            <div>
              <p className="section-kicker">Situação dos números</p>
              <h2>Escolha seus números da sorte</h2>
              <p>Limite de {maxNumbersPerUser} números por telefone nesta rifa, incluindo reservas e compras anteriores.</p>
            </div>
            <div className="number-legend" aria-label="Legenda dos números">
              <div><span className="number-legend__dot number-legend__dot--available" /><span>Disponíveis<strong>{availableNumbers}</strong></span></div>
              <div><span className="number-legend__dot number-legend__dot--reserved" /><span>Reservados<strong>{numberStatusCounts.reserved}</strong></span></div>
              <div><span className="number-legend__dot number-legend__dot--confirmed" /><span>Confirmados<strong>{numberStatusCounts.confirmed}</strong></span></div>
            </div>
          </div>

          <div className="number-pagination" aria-label="Páginas de números">
            {Array.from({ length: pageCount }, (_, pageIndex) => {
              const start = pageIndex * pageSize + 1;
              const end = Math.min(start + pageSize - 1, totalNumbers);
              return (
                <button
                  key={pageIndex}
                  type="button"
                  className={currentPage === pageIndex ? 'number-pagination__button number-pagination__button--active' : 'number-pagination__button'}
                  aria-current={currentPage === pageIndex ? 'page' : undefined}
                  onClick={() => setCurrentPage(pageIndex)}
                >
                  {String(start).padStart(2, '0')}–{String(end).padStart(2, '0')}
                </button>
              );
            })}
          </div>

          {numberRequest.status === 'loading' ? (
            <p className="raffles-empty" role="status">Carregando disponibilidade dos números...</p>
          ) : numberRequest.status === 'error' ? (
            <div className="raffles-empty" role="alert">
              <p>Não foi possível carregar a disponibilidade desta página.</p>
              <button className="button" type="button" onClick={() => setNumberRetryKey((current) => current + 1)}>Tentar novamente</button>
            </div>
          ) : (
          <div className="number-grid">
            {visibleNumbers.map((number) => {
              const status = numberStatuses[number];
              const isSelected = selectedNumbers.includes(number);
              const numberClass = isSelected ? 'number-button number-button--selected' : `number-button number-button--${status}`;
              const statusText = status === 'available' ? 'disponível' : status === 'reserved' ? 'reservado' : 'confirmado';
              return (
                <button
                  key={number}
                  className={numberClass}
                  type="button"
                  disabled={status !== 'available'}
                  aria-pressed={isSelected}
                  aria-label={`Número ${String(number).padStart(2, '0')}, ${isSelected ? 'selecionado' : statusText}`}
                  onClick={() => toggleNumber(number)}
                >
                  {String(number).padStart(2, '0')}
                </button>
              );
            })}
          </div>
          )}
          {numberRequest.refreshError && <p className="raffles-empty" role="alert">A disponibilidade não pôde ser atualizada. Os números são confirmados novamente antes da reserva.</p>}

          <div className="number-picker-footer">
            <div className="number-picker-footer__available">
              <span className="number-picker-footer__icon"><Icon name="ticket" size={20} /></span>
              <span><strong>{availableNumbers} números ainda disponíveis</strong><small>A partir de {formatCurrency(price)}</small></span>
            </div>
            <div className="number-picker-footer__selection">
              <span>{selectedNumbers.length ? `${selectedNumbers.length} ${selectedNumbers.length === 1 ? 'número selecionado' : 'números selecionados'}` : 'Selecione números disponíveis'}</span>
              <strong>{formatCurrency(selectedNumbersValue)}</strong>
            </div>
            <button
              className="button number-picker-footer__button"
              type="button"
              disabled={!selectedNumbers.length || numberRequest.status !== 'ready'}
              onClick={() => { setFormError(''); setCheckoutStep('identification'); }}
            >
              Continuar <Icon name="arrow" size={18} />
            </button>
          </div>
          <p className="detail-demo-note">Os números ficam pré-reservados por 15 minutos após gerar o Pix. Pague antes do prazo; a confirmação é manual pelo organizador.</p>
        </section> : <section className="raffle-completed-note"><strong>Esta rifa já foi sorteada.</strong><p>As participações foram encerradas. Confira o resultado oficial acima.</p><a className="button" href="/rifas">Ver outras rifas <Icon name="arrow" size={18} /></a></section>}
      </div>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="container">
        <p className="section-kicker">Página não encontrada</p>
        <h1>Essa rifa não está disponível.</h1>
        <p>Confira as rifas ativas para encontrar outro prêmio.</p>
        <a className="button" href="/rifas">Ver rifas <Icon name="arrow" size={18} /></a>
      </div>
    </main>
  );
}

function HomePage() {
  return <main className="platform-home">
    <section className="platform-hero">
      <div className="container platform-hero__grid">
        <div className="platform-hero__copy">
          <p className="section-kicker">Rifou · plataforma de rifas</p>
          <h1>Rifas bem organizadas.<br /><span>Participação simples.</span></h1>
          <p>O Rifou ajuda organizadores a administrar campanhas com clareza e dá aos participantes um jeito fácil de escolher números e acompanhar cada etapa.</p>
          <div className="platform-hero__actions"><a className="button" href="/rifas">Ver rifas <Icon name="arrow" size={18} /></a><a className="text-link" href="/consultar-compra">Consultar compra</a></div>
          <a className="platform-organizer-link" href="/organizador/solicitar-acesso">Quero organizar minhas rifas <Icon name="arrow" size={16} /></a>
        </div>
        <div className="platform-hero__visual" aria-label="Resumo da plataforma Rifou">
          <div className="platform-hero__ticket"><span className="platform-hero__ticket-icon"><Icon name="ticket" size={27} /></span><div><small>Uma jornada mais clara</small><strong>Escolha, acompanhe, confira.</strong></div><span className="platform-hero__check"><Icon name="check" size={18} /></span></div>
          <div className="platform-hero__features"><div><Icon name="shield" size={19} /><span><strong>Organização</strong><small>Reservas e pagamentos acompanhados</small></span></div><div><Icon name="eye" size={19} /><span><strong>Transparência</strong><small>Resultados e histórico acessíveis</small></span></div><div><Icon name="search" size={19} /><span><strong>Acesso fácil</strong><small>Encontre campanhas e compras</small></span></div></div>
        </div>
      </div>
    </section>
    <section className="platform-audience section"><div className="container"><div className="section-heading"><p className="section-kicker">Para cada lado da rifa</p><h2>Mais clareza em toda a jornada</h2></div><div className="platform-audience__grid"><article><span>01</span><h3>Para quem organiza</h3><p>Crie rifas, acompanhe reservas, confira participantes e consulte os resultados em um só painel.</p><a href="/organizador/solicitar-acesso">Conheça o painel <Icon name="arrow" size={16} /></a></article><article><span>02</span><h3>Para quem participa</h3><p>Veja rifas disponíveis, escolha números livres e consulte o andamento da sua compra com um código próprio.</p><a href="/rifas">Encontrar uma rifa <Icon name="arrow" size={16} /></a></article></div></div></section>
    <section className="platform-how section" id="como-funciona"><div className="container"><div className="section-heading"><p className="section-kicker">Como funciona</p><h2>Uma jornada em passos simples</h2></div><div className="platform-how__grid"><article><span>1</span><h3>Encontre uma rifa</h3><p>Pesquise pelo nome da campanha ou do organizador.</p></article><article><span>2</span><h3>Escolha seus números</h3><p>A disponibilidade é validada novamente quando a reserva é criada.</p></article><article><span>3</span><h3>Acompanhe sua compra</h3><p>Guarde o código da compra para consultar o status e os números selecionados.</p></article></div><div className="platform-payment-note"><Icon name="shield" size={19} /><p><strong>Sobre pagamentos:</strong> o Pix é enviado diretamente para a chave cadastrada pelo organizador. A reserva dura 15 minutos e o pagamento é confirmado manualmente. Não pague depois que o prazo expirar.</p></div></div></section>
    <section className="platform-cta"><div className="container"><div><p className="section-kicker">Comece por aqui</p><h2>Pronto para encontrar sua próxima rifa?</h2><p>Consulte o catálogo público ou procure uma compra pelo código.</p></div><div><a className="button" href="/rifas">Ver rifas <Icon name="arrow" size={18} /></a><a className="platform-cta__link" href="/consultar-compra">Consultar compra</a></div></div></section>
  </main>;
}

const purchaseStatusLabel = {
  PENDING: 'Aguardando pagamento',
  UNDER_REVIEW: 'Comprovante enviado · análise pendente',
  EXPIRED: 'Reserva expirada',
  CONFIRMED: 'Pagamento confirmado',
  RESOLUTION_REQUIRED: 'Precisa de resolução pelo organizador',
  UNDER_REVIEW_EXPIRED: 'Reserva expirada · comprovante em análise',
};

function PublicPurchasePage() {
  const [code, setCode] = useState('');
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);

  const lookupCode = useCallback(async (requestedCode) => {
    const normalizedCode = requestedCode.trim().toUpperCase().replace(/\s+/g, '');
    setError(''); setNotice(''); setPurchase(null);
    const isLegacyCode = /^RF-[A-F0-9]{32}$/.test(normalizedCode);
    const isShortCode = /^RF-[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){3}$/.test(normalizedCode);
    if (!isLegacyCode && !isShortCode) { setError('Confira o código no formato RF-XXXX-XXXX-XXXX-XXXX.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/purchases/${encodeURIComponent(normalizedCode)}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Não foi possível localizar esta compra.');
      setPurchase(payload.item);
    } catch (lookupError) { setError(lookupError.message || 'Não foi possível consultar a compra.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const queryCode = new URLSearchParams(window.location.search).get('codigo') || '';
    if (queryCode) {
      const normalizedQueryCode = queryCode.trim().toUpperCase().replace(/\s+/g, '');
      setCode(normalizedQueryCode);
      void lookupCode(normalizedQueryCode);
    }
  }, [lookupCode]);

  const lookup = async (event) => {
    event?.preventDefault();
    await lookupCode(code);
  };

  const submitProof = async (event) => {
    event.preventDefault();
    const file = event.currentTarget.elements.proof.files?.[0];
    if (!file || !purchase) return;
    if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setError('Escolha uma imagem JPG, PNG, WebP ou AVIF de até 5 MB.'); return;
    }
    setUploading(true); setError(''); setNotice('');
    try {
      const endpoint = `/api/purchases/${encodeURIComponent(purchase.purchaseCode)}`;
      const authorizationResponse = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'request-upload', contentType: file.type, size: file.size }) });
      const authorization = await authorizationResponse.json().catch(() => ({}));
      if (!authorizationResponse.ok) throw new Error(authorization.message || 'Não foi possível iniciar o envio.');
      const form = new FormData();
      Object.entries(authorization.upload.fields).forEach(([key, value]) => form.append(key, value));
      form.append('file', file);
      const uploadResponse = await fetch(authorization.upload.url, { method: 'POST', body: form });
      if (!uploadResponse.ok) throw new Error('O arquivo não foi aceito pelo armazenamento. Tente novamente.');
      const submitResponse = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'submit-proof', objectKey: authorization.upload.objectKey }) });
      const submitted = await submitResponse.json().catch(() => ({}));
      if (!submitResponse.ok) throw new Error(submitted.message || 'Não foi possível associar o comprovante à compra.');
      await lookup();
      setNotice('Comprovante enviado. O organizador precisa validar o pagamento manualmente.');
    } catch (uploadError) { setError(uploadError.message || 'Não foi possível enviar o comprovante.'); }
    finally { setUploading(false); }
  };

  return <main className="public-purchase-page"><div className="container public-purchase-page__container"><nav className="breadcrumbs" aria-label="Navegação estrutural"><a href="/">Início</a><Icon name="arrow" size={14} /><span>Consultar compra</span></nav><header><p className="section-kicker">Acompanhamento público</p><h1>Consultar compra</h1><p>Informe o código recebido ao iniciar sua reserva. Não é necessário entrar ou criar uma conta.</p></header><form className="public-purchase-search" onSubmit={lookup}><label htmlFor="purchase-code">Código da compra</label><div><input id="purchase-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoComplete="off" placeholder="RF-XXXX-XXXX-XXXX-XXXX" maxLength={35} required /><button className="button" type="submit" disabled={loading}>{loading ? 'Consultando…' : 'Consultar'}</button></div><small>O código é único e não revela seus dados de contato.</small></form>{error && <p className="checkout-error" role="alert">{error}</p>}{notice && <p className="dashboard-notice" role="status">{notice}</p>}{purchase && <section className="public-purchase-result" aria-live="polite"><div className="public-purchase-result__heading"><div><p className="section-kicker">{purchase.purchaseCode}</p><h2>{purchase.raffleTitle}</h2><p>Organizada por {purchase.organizer}</p></div><span className={`public-purchase-status public-purchase-status--${purchase.status.toLowerCase()}`}>{purchaseStatusLabel[purchase.status] || purchaseStatusLabel.PENDING}</span></div><dl><div><dt>Números selecionados</dt><dd>{purchase.numbers.map((number) => String(number).padStart(2, '0')).join(', ')}</dd></div><div><dt>Valor total</dt><dd>{formatCurrency(purchase.amountInCents / 100)}</dd></div><div><dt>Data da compra</dt><dd>{purchase.createdAt ? new Date(purchase.createdAt).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</dd></div><div><dt>Status da rifa</dt><dd>{purchase.raffleStatus === 'ACTIVE' ? 'Ativa' : purchase.raffleStatus === 'DRAWN' ? 'Sorteada' : purchase.raffleStatus}</dd></div>{purchase.paymentConfirmedAt && <div><dt>Pagamento confirmado</dt><dd>{new Date(purchase.paymentConfirmedAt).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}</dl>{purchase.proofReviewStatus === 'REJECTED' && purchase.status === 'PENDING' && <p className="proof-review-card__conflict">O organizador rejeitou o último comprovante{purchase.proofReviewNote ? `: ${purchase.proofReviewNote}` : '.'} {purchase.canSubmitProof ? 'Você pode enviar outra imagem enquanto a reserva estiver válida.' : ''}</p>}{purchase.status === 'RESOLUTION_REQUIRED' && <p className="proof-review-card__conflict">Números comprometidos: {purchase.conflictNumbers.map((number) => String(number).padStart(2, '0')).join(', ') || 'consulte o organizador'}. A aprovação foi bloqueada. Resolução financeira: {purchase.refundResolutionStatus === 'REFUNDED' ? 'reembolso registrado pelo organizador' : purchase.refundResolutionStatus === 'NOT_REQUIRED' ? 'marcada como não necessária' : 'pendente'}.</p>}{purchase.result && <div className={`public-purchase-result__winner${purchase.result.participantWon ? ' public-purchase-result__winner--won' : ''}`}><strong>{purchase.result.participantWon ? 'Você foi o ganhador!' : 'Resultado do sorteio'}</strong><span>Número {String(purchase.result.number).padStart(2, '0')} · {purchase.result.winnerName}</span><small>{purchase.result.drawnAt ? formatDrawDateTime(purchase.result.drawnAt) : ''}</small></div>}{purchase.isDemo && <p className="platform-payment-note"><Icon name="shield" size={18} /><span>Este pedido foi criado em modo demonstrativo. O QR Pix não aceita pagamentos.</span></p>}{purchase.canSubmitProof && <form className="public-proof-form" onSubmit={submitProof}><label htmlFor="purchase-proof">Enviar imagem do comprovante</label><input id="purchase-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required /><small>O envio não confirma o pagamento. O organizador analisará o arquivo e validará novamente a disponibilidade dos números.</small><button className="button" type="submit" disabled={uploading}>{uploading ? 'Enviando…' : 'Enviar para análise'}</button></form>}<a className="text-link" href={`/rifas/${encodeURIComponent(purchase.raffleId)}`}>Ver página da rifa <Icon name="arrow" size={16} /></a></section>}</div></main>;
}

function PublicOrganizerPage({ publicId }) {
  const [profile, setProfile] = useState(null);
  const [raffles, setRaffles] = useState([]);
  const [request, setRequest] = useState({ status: 'loading' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/organizadores/${encodeURIComponent(publicId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'Perfil público não encontrado.');
        setProfile(payload.profile || null);
        setRaffles(Array.isArray(payload.items) ? payload.items : []);
        setRequest({ status: 'ready' });
      })
      .catch((error) => { if (!controller.signal.aborted) setRequest({ status: 'error', message: error.message }); });
    return () => controller.abort();
  }, [publicId, retry]);

  if (request.status !== 'ready') return <main className="public-profile-page"><div className="container">{request.status === 'loading' ? <p className="raffles-empty" role="status">Carregando perfil…</p> : <div className="raffles-empty" role="alert"><h1>Este perfil não está disponível.</h1><p>{request.message}</p><button className="button" type="button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></div>}</div></main>;
  const featured = raffles.filter((raffle) => raffle.featured);
  const other = raffles.filter((raffle) => !raffle.featured && raffle.status === 'ACTIVE');
  const otherDrawn = raffles.filter((raffle) => !raffle.featured && raffle.status === 'DRAWN');
  return <main className="public-profile-page"><div className="container"><section className="public-profile-heading"><div className="public-profile-heading__logo">{profile.logoUrl ? <img src={profile.logoUrl} alt={`Logotipo de ${profile.publicName}`} /> : <span>{profile.publicName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>}</div><div><p className="section-kicker">Perfil público do organizador</p><h1>{profile.publicName}</h1><p>{profile.message || 'Confira as rifas ativas e os resultados deste organizador.'}</p></div><a className="public-profile-heading__consult" href="/consultar-compra">Consultar compra</a></section>{featured.length > 0 && <section className="section public-profile-raffles"><div className="section-heading"><p className="section-kicker">Selecionadas pelo organizador</p><h2>Rifas em destaque</h2></div><div className="raffle-grid">{featured.map((raffle) => <RaffleCard key={raffle.id} raffle={raffle} />)}</div></section>}<section className="section public-profile-raffles"><div className="section-heading"><p className="section-kicker">Campanhas públicas</p><h2>{featured.length ? 'Todas as rifas' : 'Rifas e resultados'}</h2></div>{other.length ? <div className="raffle-grid">{other.map((raffle) => <RaffleCard key={raffle.id} raffle={raffle} />)}</div> : !featured.length ? <p className="raffles-empty">Este organizador ainda não tem rifas públicas disponíveis.</p> : null}</section><DrawnRafflesSection raffles={featured.filter((raffle) => raffle.status === 'DRAWN').concat(otherDrawn)} /></div></main>;
}

async function savePurchaseReceiptPdf(order, raffle) {
  const doc = new jsPDF();
  const lookupUrl = `${window.location.origin}/consultar-compra?codigo=${encodeURIComponent(order.purchaseCode)}`;
  const numbers = order.numbers.map((number) => String(number).padStart(2, '0')).join(', ');
  const expiresAt = order.expiresAt ? new Date(order.expiresAt).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  let y = 55;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(22, 61, 44);
  doc.text('RIFOU', 20, 24);
  doc.setFontSize(16);
  doc.setTextColor(23, 37, 29);
  doc.text('Comprovante da reserva', 20, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Rifa', 20, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(raffle.title, 170);
  doc.text(titleLines, 20, y);
  y += titleLines.length * 6 + 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Código da compra', 20, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(order.purchaseCode, 20, y);
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const numberLines = doc.splitTextToSize(`Números: ${numbers}`, 170);
  doc.text(numberLines, 20, y);
  y += numberLines.length * 6 + 3;
  doc.text(`Valor total: ${formatCurrency(order.amountInCents / 100)}`, 20, y);
  y += 8;
  doc.text(`Reserva válida até: ${expiresAt}`, 20, y);
  y += 15;
  doc.setTextColor(163, 65, 41);
  doc.setFont('helvetica', 'bold');
  const receiptNotice = order.isDemo
    ? 'Reserva demonstrativa. Este documento não confirma pagamento.'
    : 'Este comprovante registra a reserva. O Pix deve ser pago em até 15 minutos; o organizador confirma o pagamento manualmente.';
  const noticeLines = doc.splitTextToSize(receiptNotice, 170);
  doc.text(noticeLines, 20, y);
  y += noticeLines.length * 6 + 10;
  doc.setTextColor(23, 37, 29);
  doc.setFont('helvetica', 'normal');
  doc.text('Acesse este link para consultar a compra:', 20, y);
  y += 10;
  doc.setTextColor(33, 124, 88);
  doc.textWithLink('Consultar compra no RIFOU', 20, y, { url: lookupUrl });
  y += 10;
  doc.setTextColor(23, 37, 29);
  doc.setFontSize(8);
  const urlLines = doc.splitTextToSize(lookupUrl, 170);
  doc.text(urlLines, 20, y);
  doc.link(20, y - 3, 170, urlLines.length * 4, { url: lookupUrl });
  doc.save(`rifou-comprovante-${order.purchaseCode}.pdf`);
}

function RafflesLoadState({ error, onRetry }) {
  return (
    <main className="raffles-state">
      <div className="raffles-state__content" role={error ? 'alert' : 'status'}>
        {error ? (
          <>
            <p className="section-kicker">Não foi possível carregar</p>
            <h1>As rifas não estão disponíveis agora.</h1>
            <p>Confira sua conexão e tente novamente.</p>
            <button className="button" type="button" onClick={onRetry}>Tentar novamente</button>
          </>
        ) : (
          <>
            <span className="raffles-state__spinner" aria-hidden="true" />
            <p>Carregando rifas...</p>
          </>
        )}
      </div>
    </main>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [raffles, setRaffles] = useState([]);
  const [drawnRaffles, setDrawnRaffles] = useState([]);
  const [rafflesRequest, setRafflesRequest] = useState({ status: 'loading' });
  const [raffleDetail, setRaffleDetail] = useState(null);
  const [raffleDetailRequest, setRaffleDetailRequest] = useState({ status: 'loading' });
  const [rafflesRetryKey, setRafflesRetryKey] = useState(0);
  const noticeTimeout = useRef(null);
  const pathname = usePathname() || '/';
  const currentPath = pathname.replace(/\/+$/, '') || '/';
  const isOrganizerRoute = currentPath === '/organizador' || currentPath.startsWith('/organizador/');
  const detailMatch = currentPath.match(/^\/rifas\/([^/]+)$/);
  const organizerProfileMatch = currentPath.match(/^\/organizadores\/([A-F0-9]{32})$/i);
  const raffleIdFromPath = detailMatch?.[1] || '';
  const isCatalogRoute = currentPath === '/rifas';
  const selectedRaffle = detailMatch ? raffleDetail : null;
  const pageTitle = selectedRaffle
    ? `${selectedRaffle.title} | RIFOU`
    : currentPath === '/rifas' ? 'Ver rifas | RIFOU'
      : currentPath === '/consultar-compra' ? 'Consultar compra | RIFOU'
      : isOrganizerRoute ? `${currentPath === '/organizador/dashboard' ? 'Painel do organizador' : 'Acesso do organizador'} | RIFOU`
        : 'RIFOU — App de Rifas';

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  useEffect(() => {
    if (isOrganizerRoute || raffleIdFromPath || !isCatalogRoute) return undefined;

    const controller = new AbortController();
    const loadRaffles = async () => {
      setRafflesRequest({ status: 'loading' });
      try {
      const loadAllPublicRaffles = async (status) => {
        const items = [];
        let nextToken = null;
        do {
          const query = new URLSearchParams({ status, limit: '50' });
          if (nextToken) query.set('nextToken', nextToken);
          const response = await fetch(`/api/raffles?${query}`, { method: 'GET', cache: 'no-store', signal: controller.signal });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.message || 'Falha ao buscar rifas.');
          if (!Array.isArray(payload.items)) throw new Error('A resposta da API de rifas é inválida.');
          items.push(...payload.items);
          nextToken = payload.nextToken || null;
        } while (nextToken && !controller.signal.aborted);
        return items;
      };
      const [activeItems, drawnItems] = await Promise.all([
        loadAllPublicRaffles('ACTIVE'),
        loadAllPublicRaffles('DRAWN'),
      ]);
      setRaffles(activeItems);
      setDrawnRaffles(drawnItems);
        setRafflesRequest({ status: 'ready' });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Não foi possível carregar as rifas.', error);
        setRafflesRequest({ status: 'error' });
      }
    };

    loadRaffles();
    return () => controller.abort();
  }, [isOrganizerRoute, raffleIdFromPath, isCatalogRoute, currentPath, rafflesRetryKey]);

  useEffect(() => {
    if (!raffleIdFromPath) return undefined;

    const controller = new AbortController();
    const raffleId = raffleIdFromPath;
    const loadRaffle = async () => {
      setRaffleDetailRequest({ status: 'loading' });
      try {
        const response = await fetch(`/api/raffles/${encodeURIComponent(raffleId)}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message || 'Falha ao buscar a rifa.');
        if (!payload?.item || payload.item.id !== raffleId) {
          throw new Error('A resposta da API da rifa é inválida.');
        }
        setRaffleDetail(payload.item);
        setRaffleDetailRequest({ status: 'ready' });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Não foi possível carregar a rifa.', error);
        setRaffleDetailRequest({ status: 'error' });
      }
    };

    loadRaffle();
    return () => controller.abort();
  }, [raffleIdFromPath, rafflesRetryKey]);

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(noticeTimeout.current);
    noticeTimeout.current = window.setTimeout(() => setNotice(''), 3200);
  };

  const publicRequest = detailMatch ? raffleDetailRequest : rafflesRequest;
  if (!isOrganizerRoute && (isCatalogRoute || detailMatch) && publicRequest.status !== 'ready') {
    return (
      <>
        <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        <RafflesLoadState
          error={publicRequest.status === 'error'}
          onRetry={() => setRafflesRetryKey((current) => current + 1)}
        />
        <SiteFooter showNotice={showNotice} />
      </>
    );
  }

  if (!isOrganizerRoute && currentPath === '/') return <><Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} /><HomePage /><SiteFooter showNotice={showNotice} /></>;
  if (!isOrganizerRoute && currentPath === '/consultar-compra') return <><Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} /><PublicPurchasePage /><SiteFooter showNotice={showNotice} /></>;
  if (!isOrganizerRoute && organizerProfileMatch) return <><Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} /><PublicOrganizerPage publicId={organizerProfileMatch[1].toUpperCase()} /><SiteFooter showNotice={showNotice} /></>;

  return (
    <>
      {!isOrganizerRoute && <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />}

      {isOrganizerRoute ? (
        <OrganizerRoutes currentPath={currentPath} />
      ) : currentPath === '/rifas' ? (
        <RafflesPage raffles={raffles} drawnRaffles={drawnRaffles} />
      ) : selectedRaffle ? (
        <RaffleDetailsPage key={selectedRaffle.id} raffle={selectedRaffle} showNotice={showNotice} />
      ) : (
        <NotFoundPage />
      )}

      {!isOrganizerRoute && <SiteFooter showNotice={showNotice} />}

      <div className={`toast${notice ? ' toast--visible' : ''}`} role="status" aria-live="polite">{notice}</div>
    </>
  );
}

export default App;
