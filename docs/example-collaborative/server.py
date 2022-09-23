#!/bin/python

# Why Python? The server could be written in a different language (perhaps Node would make sense),
# or even work directly with WebRTC. Python was chosen because a simple web server can be created
# relatively easily.

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, test as startServer
import json
from threading import Lock
from math import isnan
import re
from pathlib import Path

def get_page_html()-> str:
	return """
	<!DOCTYPE html>
	<html>
		<head>
			<meta charset='utf-8'/>
			<meta name='viewport' content='width=device-width,initial-scale=1.0,user-scalable=no'/>
			<title>Example Collaborative Editor</title>
		</head>
		<body>
			Loading...
		</body>
		<script src="./script.js"></script>
	</html>
	"""

commandsSincePathExp = re.compile(r'^[/]commandsSince[/](\d+)$')

class CommandDataStore:
	def __init__(self):
		self.command_data = []
		self.command_data_mutex = Lock()
		self.id_counter = 0

	def add_command(self, json_data: str):
		self.id_counter += 1
		self.command_data_mutex.acquire()
		self.command_data.append({
			"id": self.id_counter,
			"data": json_data
		})

		# Limit the number of commands in storage
		if len(self.command_data) > 500:
			self.command_data = self.command_data[1:]

		self.command_data_mutex.release()

	def get_commands_since(self, min_id: int):
		def command_matches(command_record: any):
			return command_record['id'] >= min_id

		return list(filter(
			command_matches,
			self.command_data
		))

data_store = CommandDataStore()

class RequestHandler(BaseHTTPRequestHandler):
	def __init__(self, *argv, **kwargs):
		self.command_data = data_store
		BaseHTTPRequestHandler.__init__(self, *argv, **kwargs)

	def do_GET(self):
		if self.path == '/' or self.path == '/index.html':
			self.send_text(get_page_html(), 'text/html')
		elif self.path == '/script.js':
			self.send_file(Path('./script.bundle.js'), 'application/javascript')
		elif self.path.startswith('/commandsSince/'):
			self.handle_command_request()
		else:
			self.send_error(HTTPStatus.NOT_FOUND, 'Invalid path')
	
	def do_POST(self):
		if self.path == '/postCommand':
			self.handle_command_post()
		else:
			self.send_error(HTTPStatus.BAD_REQUEST, 'Unknown request.')

	def handle_command_request(self):
		"""Handle a request for commands since a given timestamp
		"""
		match = commandsSincePathExp.match(self.path)
		if match is None:
			self.send_error(HTTPStatus.NOT_FOUND, 'commandsSince requests must match /^\\/commandsSince\\/\\d+$/')
			return

		since_id = int(match.group(1)) + 1
		result = self.command_data.get_commands_since(since_id)
		self.send_json(result)
	
	def handle_command_post(self):
		"""Handle new commands being posted to the server.
		"""

		try:
			target_len = int(self.headers.get('Content-Length'))
			if isnan(target_len):
				self.send_error(HTTPStatus.BAD_REQUEST, 'Content-Length must be a number')

			# Limit size to 2 MiB
			max_size = 1024 * 1024 * 2

			if max_size < target_len:
				self.send_error(
					HTTPStatus.BAD_REQUEST,
					'JSON data exceeds maximum size of {} KiB'.format(max_size)
				)
				return

			data = self.rfile.read(target_len)
			self.add_command_from(data)
		except json.JSONDecodeError:
			print('Error decoding JSON')
			self.send_error(HTTPStatus.BAD_REQUEST, 'Bad JSON data.')
		else:
			self.send_response(HTTPStatus.OK)
			self.send_headers()
			self.send_header('Content-Length', 0)
			self.end_headers()
	
	def add_command_from(self, data: str):
		"""Add a command from the given JSON data. May throw a JSONDecodeError."""
		json_data = json.loads(data)
		self.command_data.add_command(json_data)

	def send_headers(self):
		pass

	def send_json(self, obj: any):
		"""Convert [obj] to text and send it as JSON (as a response)."""
		self.send_text(json.dumps({ "commands": obj }), 'application/json')

	def send_text(self, content: str, contentType: str = 'text/html'):
		data = bytes(content, 'utf-8')

		self.send_response(HTTPStatus.OK)
		self.send_headers()
		self.send_header('Content-Type', contentType)
		self.send_header('Content-Length', len(data))
		self.end_headers()
		self.wfile.write(data)

	def send_file(self, filepath: Path, contentType: str = 'text/html'):
		with open(filepath, 'r') as f:
			# TODO: Use something like shutil.copyfileobj instead of reading the entire
			#       file at once.
			self.send_text(f.read(), contentType)

startServer(HandlerClass=RequestHandler, protocol="HTTP/1.1")
