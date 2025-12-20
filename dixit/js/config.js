// Globální proměnné pro karty hráče
let currentCardIndex = 0;
let cards = [];
let isCardViewerVisible = false;
let isLoading = false;

// Pro vybrané karty
let selectedCards = [];
let currentSelectedCardIndex = 0;
let isSelectedCardsViewerVisible = false;

// Proměnné pro hlasování
let votingPhase = false;
let hasVoted = false;
let captainCardId = null;
let captainHash = null;
let captainColor = null;
let isVotingComplete = false; // Přidaná proměnná pro sledování stavu hlasování

// Get gameId and playerHash from URL
const hashParts = window.location.hash.substring(1).split('#');
const gameId = hashParts[0];
const playerHash = hashParts[1];