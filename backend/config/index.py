import json
import os

def handler(event: dict, context) -> dict:
    """
    Возвращает публичные конфигурационные данные для фронтенда (только публичные ключи).
    """
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    return {
        "statusCode": 200,
        "headers": {**cors_headers, "Content-Type": "application/json"},
        "body": json.dumps({
            "yandexMapsApiKey": os.environ.get("YANDEX_MAPS_API_KEY", ""),
        }),
    }
