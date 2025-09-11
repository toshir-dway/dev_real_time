import flask
from flask import Flask, render_template, Response
import json
import random
import time
from io import BytesIO
import matplotlib.pyplot as plt


app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False
app.config['JSON_SORT_KEYS'] = False
app.config['DEBUG'] = True
app.config['TESTING'] = True

def generate_stock_data():
    symbols = ['AAPL', 'GOOG', 'MSFT', 'AMZN', 'TSLA', 'FB', 'NFLX', 'NVDA', 'BABA', 'INTC', 'CSCO', 'ORCL', 'IBM', 'ADBE', 'CRM']
    stock_data = {}
    for symbol in symbols:
        price = round(random.uniform(100, 200), 2)
        change = round(random.uniform(-5, 5), 2)
        stock_data[symbol] = {
            'price': price,
            'change': change,
            'tendence': 'up' if change >= 0 else 'down'
        }
    return stock_data


@app.route('/')
def index():
    return render_template('index.html') # Assurez-vous d'avoir un dossier 'templates' avec index.html

@app.route('/stream')
def stream():
    def event_stream():
        while True:
            stock_data = generate_stock_data()
            # Format SSE: data: <votre_json>\n\n
            yield f"data: {json.dumps(stock_data)}\n\n"
            time.sleep(2) # Envoyer une mise à jour toutes les 2 secondes

    return Response(event_stream(), mimetype='text/event-stream', headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no" # Important pour Nginx/proxies
    })

@app.route('/plot')
def plot():
    stock_data = generate_stock_data()
    symbols = list(stock_data.keys())
    prices = [stock_data[s]['price'] for s in symbols]
    plt.figure(figsize=(10,4))
    plt.bar(symbols, prices, color='#4f8a8b')
    plt.xticks(rotation=45, ha='right')
    plt.ylabel('Prix')
    plt.title('Prix des actions')
    plt.tight_layout()
    buf = BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    return Response(buf.getvalue(), mimetype='image/png')

if __name__ == '__main__':
    app.run(debug=True, port=5000)



