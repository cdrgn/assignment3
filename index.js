const configuration = {
  easy:   {cards: 6,  time: 15},
  normal: {cards: 12, time: 45},
  hard:   {cards: 24, time: 90}
};

// default mode easy selected
let selectedMode = 'easy';
let pokemonNames = [];
let timer = null;
let lockBoard = false;

async function fetchAllPokemonNames() {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=1500`);
  const jsonObj = await response.json();
  return jsonObj.results.map(p => p.name);
}

function randomSelect(arr, n) {
  const selected = new Set();
  const result = [];
  while (result.length < n) {
    const candidate = arr[Math.floor(Math.random() * arr.length)];
    if (!selected.has(candidate)) {
      selected.add(candidate);
      result.push(candidate);
    }
  }
  return result;
}

async function fetchArtworks(names) {
  return Promise.all(names.map(async name => {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
    const jsonObj = await response.json();
    return jsonObj.sprites.other['official-artwork'].front_default;
  }));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

$(document).ready(() => {

  $('#modes').on('click', 'a.mode', function(e) {
    e.preventDefault();
    selectedMode = $(this).data('mode');
    $('.mode').removeClass('selected font-bold underline');
    $(this).addClass('selected font-bold underline');

    $('#game_grid')
    .removeClass('easy normal hard')
    .addClass(selectedMode);
  });

  $('#start').on('click', async e => {
    e.preventDefault();
    await setup(selectedMode);
  });

  $('#restart').on('click', e => {
    e.preventDefault();
    setup(selectedMode);
  });

  $('#theme-toggle').on('click', e => {
    e.preventDefault();
    $('html').toggleClass('dark');
  });


  $('#powerup').on('click', function(e) {
    e.preventDefault();

    if (lockBoard) return;

    // disable flip
    lockBoard = true;

    $('.card').not('.matched').addClass('flip');

    setTimeout(() => {
      $('.card').not('.matched').removeClass('flip');
      lockBoard = false;
    }, 2000);
  });


});

async function setup(mode) {

  if (timer !== null) clearInterval(timer);

  const cards = configuration[mode].cards; 
  const time = configuration[mode].time;
  const totalPairs = cards / 2;

  if (!pokemonNames.length) {
    pokemonNames = await fetchAllPokemonNames();
  }

  const selectedNames = randomSelect(pokemonNames, totalPairs);
  const fetchedArtworks = await fetchArtworks(selectedNames);

  // change from n pairs to 2n cards
  const deck = fetchedArtworks.concat(fetchedArtworks);
  shuffle(deck);

  $('#game_grid')
    .empty();
    // .removeClass('easy normal hard')
    // .addClass(mode);

  deck.forEach(url => {
    const card = $(`
      <div class="card">
      <img class="front_face" src="${url}" alt="">
      <img class="back_face" src="back.webp" alt="">
      </div>
    `);
    $('#game_grid').append(card);
  });

  let firstCard = undefined
  let secondCard = undefined

  let matchedPairs = 0;
  let totalMoves = 0;
  let timeRemaining = time;

  timer = setInterval(() => {
    timeRemaining--;
    $('#time-remaining').text(timeRemaining);
    if (timeRemaining <= 0) {
      clearInterval(timer);
      if (matchedPairs < totalPairs) {
        lockBoard = true;
        alert("Game over, you lose!");
      }
    }
  }, 1000);

  function resetTurn() {
    firstCard = undefined;
    secondCard = undefined;
    lockBoard = false;
  }

  $('#total-moves').text(totalMoves);
  $('#remaining-pairs').text(totalPairs - matchedPairs);
  $('#total-pairs').text(totalPairs);
  $('#time-remaining').text(timeRemaining);
  
  $(".card").on(("click"), function () {

    if (lockBoard) return;

    if ($(this).hasClass('flip')) return;

    totalMoves++;
    $('#total-moves').text(totalMoves);

    // lock board until transform is complete
    lockBoard = true;
    $(this).addClass('flip')
      .one("transitionend", e => {
        if (e.originalEvent.propertyName === "transform") {
          lockBoard = false;
        }
      });

    // case for first card of a pair
    if (!firstCard)
      firstCard = this;
    else {
      secondCard = this;
      lockBoard = true;
      console.log(firstCard, secondCard);
      if (
        $(firstCard).find('.front_face').attr('src')
        ==
        $(secondCard).find('.front_face').attr('src')
      ) {
        console.log("match")
        $(firstCard).addClass('matched').off('click');
        $(secondCard).addClass('matched').off('click');

        matchedPairs++;
        $('#remaining-pairs').text(totalPairs - matchedPairs);
        if (matchedPairs == totalPairs) {
          clearInterval(timer);
          $(secondCard)
            .one("transitionend", e => {
              if (e.originalEvent.propertyName === "transform") {
                alert("Congratulations, you win!");
              }
            });
        }
        
        resetTurn();
      } else {
        console.log("no match")
        setTimeout(() => {
          $(firstCard).removeClass('flip');
          $(secondCard).removeClass('flip');
          resetTurn();
        }, 1000);
      }
    }
  });
}


