const JSON_ROOT = "/mock-orals/2025"

const passagesCtr = document.querySelector('#passages-ctr');

const selectWord = (e) => {
    let sel = undefined;
    
    // Check if clicked element is a span
    if (e.target.nodeName == 'SPAN') {
        $(e.target).toggleClass('has-error');
        return;
    } else if (e.target.nodeName == 'DFN') {
        sel = window.getSelection();
        let node = e.target.nextSibling;
        sel.collapse(node, 0);
        for (; node.nextSibling != null; node = node.nextSibling) {
            if (node.nodeName == 'DFN') break;
        }
        if (node.nodeName == 'SUP')
            sel.extend(node);
        else
            sel.extend(node, node.length);
    }

    // Check if clicked element is a paragraph (P)
    if (e.target.nodeName == 'P') {
        sel = window.getSelection();
        let range = sel.getRangeAt(sel.rangeCount - 1);
        sel.collapseToStart();
        sel.modify('move', 'forward', 'character');
        sel.modify('move', 'backward', 'word');
        sel.extend(range.endContainer, range.endOffset);
        sel.modify('extend', 'backward', 'character');
        sel.modify('extend', 'forward', 'word');
    }
    
    if (sel === undefined) return;
    
    let range = sel.getRangeAt(0); // Get the first selection range
    let startNode = range.startContainer;
    let endNode = range.endContainer;

    // Create a document fragment to extract the selected content and manipulate it
    let docFrag = range.cloneContents();

    // Get all spans within the document fragment
    let spans = docFrag.querySelectorAll('span');

    // Toggle the 'has-error' class on each span within the selection
    spans.forEach((span) => {
        span.classList.toggle('has-error');
    });

    // Now reinsert the modified content back to the DOM
    range.deleteContents();  // Remove the original selected content
    range.insertNode(docFrag);  // Reinsert the modified content (with the updated spans)

    // Collapse the selection to the end after the changes
    sel.collapseToEnd();
}

function displayVerses(container, passages) {
    container.off('click', '.passage');

    passages.forEach((passage, i) => {
        container.append(`<div class="passage">
                <div class="reference-top">
                    <span>${passage.reference}</span>
                    <span class="number">${i + 1}</span>
                </div>
                <p>${passage.cards.join(' ').replace(/\(\s*(\d+)\s*\)/g, '<dfn>($1)</dfn>').replace(/(?<!<[^>]*)([a-zA-Z]*\'?[a-zA-Z]+)/g,'<span>$1</span>')}</p>
                <div class="reference-bottom">
                    <span>${passage.reference}</span>
                    <a href="javascript:void(0)" onclick="clearErrors(event)">start over</a>
                </div>
            </div>`
        )
    });

    container.on('click', '.passage', selectWord);
}


(() => {
    const DEBUG_URL = ""
    const valueOf = (node) => node.val() || node.prop('placeholder');
    const setDefault = (node, value) => node.prop('placeholder', value);
    
    const formValid = (valid = !document.querySelectorAll('.has-error').length) => {
        document.getElementById('generate').disabled = !valid;
    };
    
    const speechRateChanged = () => {
        let min_wpm = Number(valueOf($('#min_wpm'))),
            max_wpm = Number(valueOf($('#max_wpm')));
        if (isNaN(min_wpm) || isNaN(max_wpm) || min_wpm > max_wpm) {
            $('#speech_rate_group').addClass('has-error');
            formValid(false);
        } else {
            $('#speech_rate_group').removeClass('has-error');
            formValid();
        }
    };
    
    document.addEventListener('DOMContentLoaded', () => {
        $('#division').change(function () {
            let division = $(this), min_wpm, max_wpm, max_words;
            switch (division.val()) {
                case 'Senior':
                    min_wpm = 150;
                    max_wpm = 170;
                    max_words = 220;
                    break;
                case 'Junior':
                    min_wpm = 130;
                    max_wpm = 150;
                    max_words = 200;
                    break;
                case 'Primary':
                    min_wpm = 110;
                    max_wpm = 130;
                    max_words = 150;
                    break;
                default:
                    division.addClass('has-error');
                    formValid(false);
                    return;
            }
            setDefault($('#min_wpm'), min_wpm);
            setDefault($('#max_wpm'), max_wpm);
            setDefault($('#max_words'), max_words);
            formValid();
        });

        $('#min_wpm, #max_wpm').change(speechRateChanged);
        
        $('#max_words').change(function () {
            let max_words = Number(valueOf($(this)));
            if (isNaN(max_words) || max_words < 1) {
                $('#max_words_group').addClass('has-error');
                formValid(false);
            } else {
                $('#max_words_group').removeClass('has-error');
                formValid();
            }
        });

        $('#minutes').change(function () {
            let minutes = Number(valueOf($(this)));
            if (isNaN(minutes) || minutes < 4) {
                $('#minutes_group').addClass('has-error');
                formValid(false);
            } else {
                $('#minutes_group').removeClass('has-error');
                formValid();
            }
        });

        $('.form-control').trigger('change');

        $('#generate, #generate-btn').click(() => {
            generatePassages();
            console.log($('#generator2'));
            $("#generator2").css('display', 'none')
            $("#curtain").css('display', 'none')
        });
    });

    const generatePassages = () => {
        let version = $('#version').val(),
            division = $('#division').val();
        
        const jsonFile = `${division.toLowerCase()}-${version.toLowerCase()}.json`

        fetch(`${JSON_ROOT}/${jsonFile}`)
            .then(response => response.json())
            .then(passages => {
                console.log(`received ${passages.length} passages`);
                let max_words = Number(valueOf($('#max_words')));
                let minutes = Number(valueOf($('#minutes')));
                if (!isNaN(max_words)) {
                    passages = passages.filter(passage => passage.word_count <= max_words);
                    console.log(`${passages.length} passages remaining after filtering`);
                }

                let min_wpm = Number(valueOf($('#min_wpm'))),
                    max_wpm = Number(valueOf($('#max_wpm')));
                let attempt, words, wpm, num_passages;
                let succeed = 0;

                for (attempt = 0; attempt < 1000000; attempt++) {
                    for (num_passages = 12; num_passages >= 6; num_passages--) {
                        let picked = pick(passages, num_passages);
                        words = picked.reduce((total, p) => (total + p.word_count), 0);
                        wpm = words / minutes;
                        if (min_wpm <= wpm && wpm <= max_wpm) {
                            console.log(`words = ${words}, wpm = ${wpm}`)
                            passages = picked;
                            succeed = 1;
                            break;
                        }
                    }
                    if (succeed == 1) {
                        break;
                    }
                }
                if (succeed == 0) {
                    $('#passages').html('<span class="text-danger">Maximum attempts reached. Please adjust parameters and try again.</span>');
                    $('#generate').prop('disabled', false);
                    return;
                }

                var container = $('#passages').html(`<h2>${division} &mdash; ${version}</h2><h4>${words} words (${Math.round(wpm)} words per minute)</h4>`);
                passagesCtr.innerHTML = "";
                container.append(passagesCtr);
                displayVerses($('#passages-ctr'), passages);
            })
            .catch(error => {
                console.error(error)
                $('#passages').html(`<span class="text-danger">${error}</span>`);
            })
            .finally(() => {
                $('#generate').prop('disabled', false);
            });
    };

    const pick = (items, count) => {
        let indices = Array.from(items, (_, i) => i),
            chosen = [];
        while (indices.length && chosen.length < count) {
            let i = Math.floor(Math.random() * indices.length);
            chosen.push(items[indices.splice(i, 1)[0]]);
        }
        return chosen;
    };

    const clearErrors = (e) => {
        $(e.target).closest('.passage').find('.has-error').removeClass('has-error');
    };
})();
