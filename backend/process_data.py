import pandas as pd
import numpy as np
import json

# 1. Load the data
def load_data(filepath):
    df = pd.read_csv(filepath)
    df['date'] = pd.to_datetime(df['date'])
    return df

# 2. Categorize transactions (Same as before)
def categorize_transaction(description):
    description = description.lower()
    if 'salary' in description or 'deposit' in description:
        return 'Income'
    elif 'rent' in description:
        return 'Rent'
    elif 'grocery' in description or 'market' in description:
        return 'Groceries'
    elif 'netflix' in description or 'movie' in description:
        return 'Entertainment'
    elif 'uber' in description or 'gas' in description:
        return 'Transport'
    elif 'coffee' in description or 'restaurant' in description:
        return 'Dining Out'
    elif 'gym' in description:
        return 'Health'
    elif 'amazon' in description or 'shopping' in description:
        return 'Shopping'
    elif 'electric' in description or 'internet' in description:
        return 'Utilities'
    else:
        return 'Other'

# 3. New Feature: Analyze Data (UPDATED)
def analyze_finances(df):
    # ... (Previous logic remains the same)
    df = df.sort_values('date')
    df['running_balance'] = df['amount'].cumsum()

    expenses = df[df['amount'] < 0].copy()
    expenses['spent'] = expenses['amount'].abs()
    category_spending = expenses.groupby('category')['spent'].sum().to_dict()

    total_income = df[df['amount'] > 0]['amount'].sum()
    total_expense = expenses['spent'].sum()
    
    burn_rate_ratio = total_expense / total_income if total_income > 0 else 0
    
    if burn_rate_ratio > 0.9:
        risk_status = "High Risk"
        risk_color = "red"
    elif burn_rate_ratio > 0.7:
        risk_status = "Caution"
        risk_color = "yellow"
    else:
        risk_status = "Healthy"
        risk_color = "green"

    # --- NEW: GENERATE RECOMMENDATIONS ---
    recommendations = []

    # Rule 1: High Burn Rate
    if burn_rate_ratio > 0.8:
        recommendations.append({
            "icon": "alert",
            "text": "High Spending Alert",
            "detail": f"You are spending {int(burn_rate_ratio*100)}% of your income. Try to pause non-essential purchases."
        })
    
    # Rule 2: Dining Out Check
    dining_spend = category_spending.get('Dining Out', 0)
    if dining_spend > 100:
        recommendations.append({
            "icon": "utensils",
            "text": "Optimize Dining Costs",
            "detail": f"You spent ${dining_spend:.2f} on dining out. Cooking at home could save you money."
        })

    # Rule 3: Shopping Check
    shopping_spend = category_spending.get('Shopping', 0)
    if shopping_spend > 150:
        recommendations.append({
            "icon": "shopping-bag",
            "text": "Review Shopping Habits",
            "detail": "Consider postponing non-essential shopping items this month to boost savings."
        })
    
    # Rule 4: Savings Goal (Always show if healthy)
    if burn_rate_ratio < 0.7:
        recommendations.append({
            "icon": "savings",
            "text": "Great Job!",
            "detail": "You have a healthy savings rate. Consider moving some funds to an investment account."
        })

    # --- END NEW ---

    timeline_data = df[['date', 'running_balance']].copy()
    timeline_data['date'] = timeline_data['date'].dt.strftime('%Y-%m-%d')
    
    insights = {
        "summary": {
            "total_income": round(total_income, 2),
            "total_expense": round(total_expense, 2),
            "net_savings": round(total_income - total_expense, 2),
            "risk_status": risk_status,
            "risk_color": risk_color
        },
        "spending_by_category": category_spending,
        "balance_timeline": timeline_data.to_dict(orient='records'),
        "recommendations": recommendations # NEW FIELD
    }
    
    return insights

# Main execution
if __name__ == "__main__":
    # Load and Categorize
    df = load_data('data.csv')
    df['category'] = df['description'].apply(categorize_transaction)
    
    # Analyze
    financial_insights = analyze_finances(df)
    
    # Print results nicely
    print("--- Financial Summary ---")
    print(f"Income: ${financial_insights['summary']['total_income']}")
    print(f"Expense: ${financial_insights['summary']['total_expense']}")
    print(f"Status: {financial_insights['summary']['risk_status']}")
    
    # Save to JSON file (This is the file our Web UI will read later!)
    with open('insights.json', 'w') as f:
        json.dump(financial_insights, f, indent=4)
        
    print("\nSuccess! 'insights.json' file created for the frontend.")