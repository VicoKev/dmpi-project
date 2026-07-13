from aiokafka import AIOKafkaProducer
import json

KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"

producer: AIOKafkaProducer | None = None


async def demarrer_producer():
    global producer
    try:
        producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode("utf-8")
        )
        await producer.start()
        print("[Kafka] Producteur demarre avec succes.")
    except Exception as e:
        producer = None
        print(f"[Kafka] Demarrage ignore (Kafka indisponible) : {e}")


async def arreter_producer():
    global producer
    if producer:
        try:
            await producer.stop()
        except Exception:
            pass


async def publier_evenement(topic: str, evenement: dict):
    global producer
    try:
        if producer:
            await producer.send_and_wait(topic, evenement)
    except Exception as e:
        print(f"[Kafka] Evenement non publie sur '{topic}' : {e}")