<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = __DIR__ . '/../data/products.json';
function readProducts($path) {
    if (!file_exists($path)) {
        http_response_code(500);
        echo json_encode(['error' => 'Data file not found']);
        exit;
    }
    $json = file_get_contents($path);
    return json_decode($json, true);
}
function writeProducts($path, $products) {
    file_put_contents($path, json_encode($products, JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $products = readProducts($dataFile);

    if (isset($_GET['id'])) {
        $id = (int) $_GET['id'];
        $product = array_values(array_filter($products, fn($p) => $p['id'] === $id));
        if (empty($product)) {
            http_response_code(404);
            echo json_encode(['error' => 'Product not found']);
        } else {
            echo json_encode($product[0]);
        }
        exit;
    }

    echo json_encode($products);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['id']) || !isset($input['quantity'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Request must include id and quantity']);
        exit;
    }

    $products = readProducts($dataFile);
    $updated = false;

    foreach ($products as &$p) {
        if ($p['id'] === (int) $input['id']) {
            $p['quantity'] = (int) $input['quantity'];
            $updated = true;
            break;
        }
    }
    unset($p);

    if (!$updated) {
        http_response_code(404);
        echo json_encode(['error' => 'Product not found']);
        exit;
    }

    writeProducts($dataFile, $products);
    echo json_encode(['success' => true, 'id' => $input['id'], 'quantity' => $input['quantity']]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);