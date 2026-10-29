const r2rTokenText = globalThis.SiteI18n?.t || ((text, values = {}) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match));

// Token Visualization Script
document.addEventListener('DOMContentLoaded', async function() {
  const tokenContainer = document.getElementById('token-content');
  if (!tokenContainer) return;

  try {
    // Fetch token data
    const response = await fetch(globalThis.SiteI18n?.asset('./static/js/tokens.json') || './static/js/tokens.json');
    if (!response.ok) {
      throw new Error(`Failed to load token data: ${response.status} ${response.statusText}`);
    }
    const tokenData = await response.json();

    // Render tokens
    renderTokens(tokenData);
  } catch (error) {
    console.error('Error loading token data:', error);

    // Display error message in the token content area
    const errorMessage = document.createElement('p');
    errorMessage.style.cssText = 'color: #dc3545; padding: 1rem; background-color: #feecf0; border-radius: 6px;';
    errorMessage.textContent = r2rTokenText('Could not load token data. Please check your network connection or try again later.');
    tokenContainer.replaceChildren(errorMessage);
  }
});

function renderTokens(tokenData) {
  const tokenContainer = document.getElementById('token-content');
  if (!tokenContainer) return;

  tokenData.forEach((token, index) => {
    const tokenElement = createTokenElement(token, index);
    tokenContainer.appendChild(tokenElement);
  });
}

function createTokenElement(token, index) {
  // Create token span element
  const tokenElement = document.createElement('span');
  tokenElement.className = `token token-type-${token.usage_type}`;
  tokenElement.textContent = token.token_text;

  // Add hover functionality for type 1 and type 2 tokens (blue and red)
  if (token.usage_type === 1 || token.usage_type === 2) {
    tokenElement.classList.add('token-hover');

    // Create popover element
    const popover = createPopoverElement(token);
    tokenElement.appendChild(popover);
  }

  return tokenElement;
}

function createPopoverElement(token) {
  const popover = document.createElement('div');
  popover.className = 'token-popover';

  // Add arrow indicator
  const arrow = document.createElement('div');
  arrow.className = 'popover-arrow';
  popover.appendChild(arrow);

  // Small model diverge text section
  if (token.small_diverge_text) {
    const smallDivergeSection = document.createElement('div');
    smallDivergeSection.className = 'popover-section';

    const smallDivergeTitle = document.createElement('div');
    smallDivergeTitle.className = 'popover-title';
    smallDivergeTitle.textContent = r2rTokenText('SLM Continuation:');
    smallDivergeSection.appendChild(smallDivergeTitle);

    const smallDivergeContent = document.createElement('div');
    smallDivergeContent.className = 'popover-content';
    const smallDivergeText = token.small_diverge_text || r2rTokenText('No data');
    const slmRegex = /^(.*?)<<(.*?)>>(.*?)$/s;
    const slmMatch = smallDivergeText.match(slmRegex);

    if (slmMatch) {
        if (slmMatch[1]) smallDivergeContent.appendChild(document.createTextNode(slmMatch[1]));
        const highlightedWord = document.createElement('span');
        highlightedWord.textContent = slmMatch[2];
        highlightedWord.style.color = '#3273dc'; // Blue for SLM
        highlightedWord.style.fontWeight = 'bold';
        smallDivergeContent.appendChild(highlightedWord);
        if (slmMatch[3]) smallDivergeContent.appendChild(document.createTextNode(slmMatch[3]));
    } else {
        smallDivergeContent.textContent = smallDivergeText;
    }
    smallDivergeSection.appendChild(smallDivergeContent);

    popover.appendChild(smallDivergeSection);
  }

  // Reference model diverge text section
  if (token.reference_diverge_text) {
    const refDivergeSection = document.createElement('div');
    refDivergeSection.className = 'popover-section';

    const refDivergeTitle = document.createElement('div');
    refDivergeTitle.className = 'popover-title';
    refDivergeTitle.textContent = r2rTokenText('LLM Continuation:');
    refDivergeSection.appendChild(refDivergeTitle);

    const refDivergeContent = document.createElement('div');
    refDivergeContent.className = 'popover-content';
    const refDivergeText = token.reference_diverge_text || r2rTokenText('No data');
    const llmRegex = /^(.*?)<<(.*?)>>(.*?)$/s;
    const llmMatch = refDivergeText.match(llmRegex);

    if (llmMatch) {
        if (llmMatch[1]) refDivergeContent.appendChild(document.createTextNode(llmMatch[1]));
        const highlightedWord = document.createElement('span');
        highlightedWord.textContent = llmMatch[2];
        highlightedWord.style.color = '#dc3545'; // Red for LLM
        highlightedWord.style.fontWeight = 'bold';
        refDivergeContent.appendChild(highlightedWord);
        if (llmMatch[3]) refDivergeContent.appendChild(document.createTextNode(llmMatch[3]));
    } else {
        refDivergeContent.textContent = refDivergeText;
    }
    refDivergeSection.appendChild(refDivergeContent);

    popover.appendChild(refDivergeSection);
  }

  // Judge response section
  if (token.judge_response) {
    const judgeSection = document.createElement('div');
    judgeSection.className = 'popover-section';

    const judgeTitle = document.createElement('div');
    judgeTitle.className = 'popover-title';
    judgeTitle.textContent = r2rTokenText('Verifier Model:');
    judgeSection.appendChild(judgeTitle);

    const judgeContent = document.createElement('div');
    judgeContent.className = 'popover-content';

    // Format judge response text
    const formattedJudgeResponse = formatJudgeResponse(token.judge_response);
    judgeContent.innerHTML = formattedJudgeResponse;

    // Add model tag based on usage_type
    const modelTag = createModelTag(token);
    if (modelTag) {
      judgeContent.appendChild(modelTag);
    }

    judgeSection.appendChild(judgeContent);
    popover.appendChild(judgeSection);
  }

  return popover;
}

function formatJudgeResponse(response) {
  if (!response) return '';

  // Replace ** with <strong> tags for bold text
  let formatted = response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Replace newlines with <br> tags
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

function createModelTag(token) {
  if (!token) return null;

  const tag = document.createElement('span');
  tag.className = 'model-tag';

  if (token.usage_type === 1) {
    tag.textContent = r2rTokenText('Neutral');
    tag.classList.add('small-model-tag');
  } else if (token.usage_type === 2) {
    tag.textContent = r2rTokenText('Divergent');
    tag.classList.add('large-model-tag');
  } else {
    return null;
  }

  return tag;
}
