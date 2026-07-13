import asyncio
from aiokafka import AIOKafkaConsumer
import json

async def consommer():
    consumer = AIOKafkaConsumer(
        "dmpi.consultations", "dmpi.dossiers",
        bootstrap_servers="localhost:9092",
        auto_offset_reset="earliest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8"))
    )
    await consumer.start()
    print("En écoute sur 'dmpi.consultations' et 'dmpi.dossiers'...")
    try:
        async for message in consumer:
            print(f"[{message.topic}] Événement reçu : {message.value}")
    finally:
        await consumer.stop()

asyncio.run(consommer())