# Sentiment Classifier for Crypto Trading

**Date**: 2026-02-12
**Context**: Alternative AI approach that could potentially provide trading edge through social sentiment analysis

## Core Principle

```
Twitter/Reddit → Sentiment Score → Trading Signal
```

The idea: Social media sentiment often **precedes** price movements. By quantifying crowd psychology, you can potentially trade ahead of the herd.

## Step-by-Step Implementation

### 1. Data Collection

```python
# Twitter API (or scraping)
import tweepy

def collect_crypto_tweets(coin_symbol, hours=24):
    tweets = []
    query = f"${coin_symbol} OR #{coin_symbol} -is:retweet lang:en"

    for tweet in tweepy.Cursor(api.search_tweets,
                                q=query,
                                count=100,
                                tweet_mode='extended').items(1000):
        tweets.append({
            'text': tweet.full_text,
            'created_at': tweet.created_at,
            'likes': tweet.favorite_count,
            'retweets': tweet.retweet_count,
            'followers': tweet.user.followers_count
        })

    return tweets
```

**Data Sources:**
- Twitter/X API (paid since 2023: $100-$5000/month)
- Reddit API (free, but rate-limited)
- Alternative: snscrape (scraping, legal gray area)
- Crypto Telegram channels
- Discord servers

**Cost considerations:**
- Twitter Basic: $100/month (10k tweets/month)
- Twitter Pro: $5000/month (1M tweets/month)
- Free alternatives exist but are less reliable

### 2. Labeling (Creating Training Data)

**Option A: Manual Labeling** (100-1000 tweets)
```
Tweet: "Bitcoin just broke $60k! 🚀 Moon soon!"
Label: BULLISH (1)

Tweet: "This crash is brutal, I'm selling everything"
Label: BEARISH (-1)

Tweet: "ETH transaction fees are still too high"
Label: NEUTRAL (0)
```

**Option B: Automatic Labeling** (heuristic-based)
```python
# Price-based (future returns)
def auto_label(tweet_time, coin_price_data):
    price_now = coin_price_data[tweet_time]
    price_4h_later = coin_price_data[tweet_time + 4h]

    return_pct = (price_4h_later - price_now) / price_now

    if return_pct > 0.02:  # +2%
        return "BULLISH"
    elif return_pct < -0.02:  # -2%
        return "BEARISH"
    else:
        return "NEUTRAL"
```

**Labeling challenges:**
- Manual = time-consuming but accurate
- Automatic = scalable but noisy (price movements have many causes)
- Hybrid approach often works best

### 3. Feature Engineering

```python
from transformers import AutoTokenizer, AutoModel
import torch

# Text features
def extract_features(tweet_text):
    features = {}

    # A. Simple features
    features['length'] = len(tweet_text)
    features['has_rocket'] = '🚀' in tweet_text
    features['has_moon'] = any(w in tweet_text.lower()
                                for w in ['moon', 'mooning'])
    features['exclamation_count'] = tweet_text.count('!')

    # B. Keyword sentiment
    bullish_words = ['buy', 'bullish', 'moon', 'pump', 'breakout',
                     'rocket', 'long', 'hodl', 'ath', 'rally']
    bearish_words = ['sell', 'bearish', 'dump', 'crash', 'short',
                     'dead', 'scam', 'rug', 'panic']

    features['bullish_count'] = sum(w in tweet_text.lower()
                                    for w in bullish_words)
    features['bearish_count'] = sum(w in tweet_text.lower()
                                    for w in bearish_words)

    # C. BERT embeddings (sophisticated)
    tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
    model = AutoModel.from_pretrained('bert-base-uncased')

    inputs = tokenizer(tweet_text, return_tensors='pt',
                       truncation=True, padding=True)
    outputs = model(**inputs)
    embedding = outputs.last_hidden_state.mean(dim=1)

    features['bert_embedding'] = embedding.detach().numpy()

    return features
```

**Feature categories:**
- **Textual**: Words, emojis, punctuation
- **Social**: Likes, retweets, follower count
- **Temporal**: Time of day, day of week
- **Network**: User influence, interaction patterns

### 4. Model Training

**Option A: Simple (Logistic Regression)**
```python
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer

# Text vectorization
vectorizer = TfidfVectorizer(max_features=1000)
X = vectorizer.fit_transform([tweet['text'] for tweet in training_data])
y = [tweet['label'] for tweet in training_data]  # 1=bullish, -1=bearish, 0=neutral

# Train
model = LogisticRegression()
model.fit(X, y)

# Predict
def predict_sentiment(new_tweet):
    X_new = vectorizer.transform([new_tweet])
    sentiment = model.predict(X_new)[0]
    confidence = model.predict_proba(X_new).max()
    return sentiment, confidence
```

**Pros:**
- Fast to train (~seconds)
- Interpretable (can see which words matter)
- Low resource requirements

**Cons:**
- Can't capture complex patterns
- No understanding of context/sarcasm
- Limited by feature engineering

**Option B: Deep Learning (BERT Fine-tuning)**
```python
from transformers import BertForSequenceClassification, Trainer

# Fine-tune BERT
model = BertForSequenceClassification.from_pretrained(
    'bert-base-uncased',
    num_labels=3  # bearish, neutral, bullish
)

# Training
trainer = Trainer(
    model=model,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    compute_metrics=compute_metrics
)
trainer.train()

# Predict
def predict_bert(tweet_text):
    inputs = tokenizer(tweet_text, return_tensors='pt')
    outputs = model(**inputs)
    prediction = torch.softmax(outputs.logits, dim=1)

    sentiment = ['BEARISH', 'NEUTRAL', 'BULLISH'][prediction.argmax()]
    confidence = prediction.max().item()

    return sentiment, confidence
```

**Pros:**
- State-of-the-art accuracy
- Understands context and nuance
- Can detect sarcasm/irony

**Cons:**
- Slow to train (hours/days)
- Requires GPU
- Resource-intensive inference

**Option C: Crypto-specific models**
```python
# Use pre-trained model on financial texts
from transformers import pipeline

classifier = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert"  # Financial sentiment BERT
)

sentiment = classifier("Bitcoin will moon soon! 🚀")[0]
# {'label': 'positive', 'score': 0.99}
```

### 5. Aggregation (From Individual Tweets to Trading Signal)

```python
def generate_trading_signal(coin_symbol, lookback_hours=4):
    # Collect tweets
    tweets = collect_crypto_tweets(coin_symbol, hours=lookback_hours)

    # Sentiment for each tweet
    sentiments = []
    for tweet in tweets:
        sentiment, confidence = predict_sentiment(tweet['text'])

        # Weight by social proof
        weight = (
            confidence *
            (1 + np.log1p(tweet['likes'])) *
            (1 + np.log1p(tweet['followers']))
        )

        sentiments.append({
            'score': sentiment,  # -1, 0, +1
            'weight': weight
        })

    # Weighted average
    total_weight = sum(s['weight'] for s in sentiments)
    weighted_sentiment = sum(s['score'] * s['weight']
                            for s in sentiments) / total_weight

    # Signal generation
    if weighted_sentiment > 0.3:
        return "BUY", weighted_sentiment
    elif weighted_sentiment < -0.3:
        return "SELL", weighted_sentiment
    else:
        return "HOLD", weighted_sentiment
```

**Aggregation strategies:**
- **Simple average**: Equal weight all tweets
- **Weighted average**: Weight by social proof (likes, followers)
- **Time decay**: Recent tweets matter more
- **Outlier removal**: Filter spam/bots
- **Influencer focus**: Only track high-follower accounts

### 6. Integration into Trading Bot

```typescript
// In trader.ts equivalent
async function shouldTradeBasedOnSentiment(coinId: string) {
    // API call to your Python sentiment service
    const response = await fetch(`http://localhost:5000/sentiment/${coinId}`);
    const { signal, score, confidence } = await response.json();

    // Only trade on strong signals
    if (confidence > 0.7 && Math.abs(score) > 0.5) {
        if (signal === "BUY" && portfolio.cash > MIN_TRADE_EUR) {
            return {
                action: "buy",
                amount: 100,
                reasoning: `Strong bullish sentiment (${score.toFixed(2)}, conf: ${confidence.toFixed(2)})`
            };
        }
        else if (signal === "SELL" && hasHolding(coinId)) {
            return {
                action: "sell",
                amount: getHoldingAmount(coinId),
                reasoning: `Strong bearish sentiment (${score.toFixed(2)}, conf: ${confidence.toFixed(2)})`
            };
        }
    }

    return { action: "hold", reasoning: "Sentiment not strong enough" };
}
```

**Architecture:**
```
┌─────────────────┐
│ Python Service  │ ← Sentiment classifier (Flask/FastAPI)
│ Port 5000       │
└────────┬────────┘
         │ HTTP API
┌────────▼────────┐
│ TypeScript Bot  │ ← Your existing trader.ts
│ Next.js         │
└─────────────────┘
```

## Why This is Better Than Current Approach

### 1. Real Training
- The model **actually learns** from data (not just text rules)
- Can recognize subtle patterns (e.g., sarcasm, irony)
- Improves with more data

### 2. Information Edge
- Twitter sentiment is often **ahead** of price movements
- Whales and insiders tweet before big moves
- Crowd panic/FOMO shows extremes (contrarian signal)

### 3. Focused Problem
- **Easier than price prediction**: "Is sentiment bullish?" vs. "What will the price be?"
- **Measurable**: Sentiment now vs. price in 4h = clear feedback
- **Iteratively improvable**: More data → better accuracy

### 4. Combinable with Technicals

```python
# Final decision = Sentiment + Technicals
def final_decision(coinId):
    sentiment_signal = get_sentiment_signal(coinId)
    technical_signal = get_technical_signal(coinId)  # RSI, MACD, etc.

    # Both must agree
    if sentiment_signal == "BUY" and technical_signal == "BUY":
        return "BUY"
    elif sentiment_signal == "SELL" and technical_signal == "SELL":
        return "SELL"
    else:
        return "HOLD"
```

**Signal confirmation matrix:**
```
Sentiment  | Technical | Action
-----------|-----------|-------
BUY        | BUY       | BUY (strong)
BUY        | NEUTRAL   | HOLD (wait)
BUY        | SELL      | HOLD (conflict)
NEUTRAL    | BUY       | HOLD (wait)
SELL       | SELL      | SELL (strong)
```

## Realistic Expectations

### What Works ✅

**1. Finding Extremes**
- When Twitter is extremely bullish → often local top (contrarian)
- When Twitter is extremely bearish → often bottom (contrarian)
- Extreme sentiment = high probability reversal

**2. Confirming Momentum**
- Rising sentiment + rising price = strong trend
- Sentiment leads price by 2-6 hours on average
- Good for trend-following strategies

**3. Detecting Breaking News**
- Sudden sentiment spike = important event
- Faster than traditional news aggregators
- Can capture regulatory news, hacks, partnerships

### What Doesn't Work ❌

**1. Perfect Prediction**
- Sentiment explains only ~20-30% of price movement
- Other factors: whale trades, exchange flows, macro events
- Still lots of noise and false signals

**2. Quick Money**
- Still have transaction costs
- False positives common (40-45%)
- Execution delays (API lag, exchange lag)

**3. Scaling**
- Twitter API is expensive
- Rate limits are tight
- Bot detection is improving
- Competition is increasing (others are doing this too)

### Realistic Performance Metrics

**Accuracy**: 55-65%
- Better than random (50%)
- Not as good as "always win" (100%)
- Comparable to human traders

**Sharpe Ratio**: 0.5-1.5
- Okay risk-adjusted returns
- Not spectacular, but positive
- Comparable to momentum strategies

**Alpha**: 5-15% annually
- If well-implemented
- Before costs
- Degrades over time as market adapts

**Win Rate vs. Profit Factor:**
```
Scenario: 100 trades
- Win rate: 60%
- Avg win: +3%
- Avg loss: -2%

Gross profit: 60 × 3% = +180%
Gross loss: 40 × 2% = -80%
Net: +100% on 100 trades = +1% per trade

After fees (1% per round-trip): Break-even
```

## Minimal Viable Product (MVP)

If you want to try this:

```python
# 1. Quick start (1-2 days work)
import snscrape.modules.twitter as sntwitter
from textblob import TextBlob  # Simple sentiment library

def quick_sentiment(coin_symbol, hours=24):
    tweets = []
    query = f"${coin_symbol} since:{datetime.now() - timedelta(hours=hours)}"

    for tweet in sntwitter.TwitterSearchScraper(query).get_items():
        if len(tweets) >= 100:
            break

        # TextBlob polarity: -1 (negative) to +1 (positive)
        sentiment = TextBlob(tweet.content).sentiment.polarity
        tweets.append(sentiment)

    avg_sentiment = np.mean(tweets)

    if avg_sentiment > 0.2:
        return "BULLISH"
    elif avg_sentiment < -0.2:
        return "BEARISH"
    else:
        return "NEUTRAL"

# Test
print(quick_sentiment("BTC", hours=4))  # "BULLISH"
```

**MVP Testing Plan:**
1. **Week 1**: Collect 7 days of sentiment + price data
2. **Week 2**: Backtest correlation (does sentiment predict price?)
3. **Week 3**: Paper trade with signals
4. **Week 4**: If profitable in paper → consider tiny real capital

This simple version shows you immediately whether sentiment has **any** effect before investing weeks in BERT training.

## Advanced Techniques

### 1. Contrarian Strategy
```python
# Trade against extreme sentiment
if avg_sentiment > 0.8:  # Extreme bullish
    return "SELL"  # Likely local top
elif avg_sentiment < -0.8:  # Extreme bearish
    return "BUY"  # Likely bottom
```

### 2. Velocity Tracking
```python
# Rate of change in sentiment
sentiment_now = get_sentiment(hours=1)
sentiment_1h_ago = get_sentiment(hours=2, offset=1)

velocity = sentiment_now - sentiment_1h_ago

if velocity > 0.3:  # Rapid bullish shift
    return "BUY"
```

### 3. Influencer Weighting
```python
# Track specific high-accuracy accounts
influencers = ['elonmusk', 'VitalikButerin', 'CZ_Binance']

def weighted_sentiment(tweets):
    score = 0
    for tweet in tweets:
        if tweet.user in influencers:
            weight = 10.0  # 10x weight
        else:
            weight = 1.0

        score += tweet.sentiment * weight

    return score / sum(weights)
```

### 4. Multi-coin Correlation
```python
# If BTC sentiment is bearish, be cautious on all alts
btc_sentiment = get_sentiment("BTC")
eth_sentiment = get_sentiment("ETH")

if btc_sentiment < -0.5:
    # Don't buy any alts regardless of their sentiment
    return "HOLD"
```

## Pitfalls to Avoid

### 1. Look-ahead Bias
```python
# WRONG: Using future price to label past tweets
tweet_at_10am = "BTC looks bullish"
price_at_2pm = price_increased()  # This is future information!
label = "BULLISH" if price_increased else "BEARISH"

# RIGHT: Use only past information
tweet_at_10am = "BTC looks bullish"
price_at_2pm = price_increased()
# Train model, then test on NEW data from next day
```

### 2. Survivorship Bias
- Don't only track coins that are popular NOW
- Track sentiment history of dead coins too
- Understand that high sentiment ≠ good investment

### 3. Overfitting to Noise
```python
# Don't optimize on too few samples
# BAD: "Model works on 10 trades!"
# GOOD: "Model tested on 1000 trades across 6 months"
```

### 4. Ignoring Regime Changes
- Sentiment-price relationship changes over time
- Bull market: Sentiment leads price up
- Bear market: Sentiment leads price down
- Sideways: Sentiment is noise

## Cost-Benefit Analysis

**Development Cost:**
- Time: 2-4 weeks full-time
- Money: $100-500/month for Twitter API
- Infrastructure: ~$50/month for compute

**Expected Benefit:**
- Best case: 15% annual alpha = €150 on €1000 capital
- Realistic: 5-10% alpha = €50-100 per year
- After costs: Probably break-even

**ROI:**
- Not profitable at small scale (<€10k capital)
- Potentially profitable at medium scale (€50k+)
- Main value: **Learning experience**

## Conclusion

**Bottom line**: Sentiment classifier is a **more realistic approach** than "AI reads public indicators" because you potentially have an information edge (social media moves faster than price).

However, even with this approach, profitable trading is **very difficult** and requires:
- Good execution
- Robust risk management
- Extensive testing
- Sufficient capital
- Ongoing maintenance

**Recommended use case**: Build it as a **signal filter** for manual trading, not as a fully automated bot. Use it to alert you to extreme sentiment shifts, then make manual decisions combining sentiment + your own analysis.

**Realistic assessment**: This is a better approach than the current one, but still won't make you rich. The real value is in learning about:
- NLP and sentiment analysis
- Machine learning pipelines
- API integration
- Real-time data processing
- Trading psychology

Think of it as an **educational project** that teaches valuable skills, with a small chance of generating modest profits if executed extremely well.
