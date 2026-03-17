import json
import urllib.request
import urllib.parse

def handler(event: dict, context) -> dict:
    """
    Геокодирование координат в адрес через OpenStreetMap Nominatim.
    Принимает lat и lng, возвращает человекочитаемый адрес на русском языке.
    """
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    try:
        params = event.get("queryStringParameters") or {}
        lat = params.get("lat")
        lng = params.get("lng")

        if not lat or not lng:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": "Требуются параметры lat и lng"}),
            }

        lat = float(lat)
        lng = float(lng)

        url = (
            "https://nominatim.openstreetmap.org/reverse?"
            + urllib.parse.urlencode({
                "lat": lat,
                "lon": lng,
                "format": "json",
                "accept-language": "ru",
                "addressdetails": 1,
            })
        )

        req = urllib.request.Request(url, headers={"User-Agent": "GeoPhotoApp/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        address_parts = data.get("address", {})
        display = data.get("display_name", "")

        road = address_parts.get("road") or address_parts.get("pedestrian") or address_parts.get("footway") or ""
        house = address_parts.get("house_number", "")
        city = (
            address_parts.get("city")
            or address_parts.get("town")
            or address_parts.get("village")
            or address_parts.get("municipality")
            or ""
        )

        if road and city:
            short_address = f"{road}{', ' + house if house else ''}, {city}"
        else:
            parts = display.split(",")
            short_address = ", ".join(p.strip() for p in parts[:3])

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "address": short_address,
                "full": display,
                "lat": lat,
                "lng": lng,
            }, ensure_ascii=False),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }
