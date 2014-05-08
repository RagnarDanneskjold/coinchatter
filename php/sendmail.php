<?php
    if(isset($_POST['email'])){
        $name = $_POST['name'];
        $email = $_POST['email'];
        $message = $_POST['message'];
        $from = 'From: CoinChatter contact form';
        $to = 'coinchatter@gmail.com';
        $subject = 'Contact Form Submission?';

        $body = "From: $name\n E-Mail: $email\n Message:\n $message";
        mail($to, $subject, $body);
        echo 'Message sent';
    }
?>