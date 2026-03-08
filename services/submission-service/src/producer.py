import pika
import json
from .config import settings

def push_to_queue(submission_dict : dict):
    connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
    channel = connection.channel()
    channel.queue_declare(queue=settings.QUEUE_NAME, durable=True)
    channel.basic_publish(
        exchange="", 
        routing_key=settings.QUEUE_NAME, 
        body=json.dumps(submission_dict), 
        properties=pika.BasicProperties(delivery_mode=2)
        )
    connection.close()