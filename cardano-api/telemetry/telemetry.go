package telemetry

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-metrics"
	prometheusmetrics "github.com/hashicorp/go-metrics/prometheus"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const (
	serviceName     = "cardano-api"
	defaultPullTime = 10 * time.Second
)

type TelemetryConfig struct {
	// empty means disabled, otherwise something like 0.0.0.0:5001
	PrometheusAddr string `json:"prometheusAddr"`
	// how often indexer positions are checked
	PullTime time.Duration `json:"pullTime"`
}

func (c TelemetryConfig) IsEnabled() bool {
	return c.PrometheusAddr != ""
}

func (c TelemetryConfig) GetPullTime() time.Duration {
	if c.PullTime <= 0 {
		return defaultPullTime
	}

	return c.PullTime
}

// Telemetry exposes metrics for prometheus
type Telemetry struct {
	prometheusServer *http.Server
	config           TelemetryConfig
	logger           hclog.Logger
}

func NewTelemetry(config TelemetryConfig, logger hclog.Logger) *Telemetry {
	return &Telemetry{
		config: config,
		logger: logger,
	}
}

func (t *Telemetry) Start() error {
	if !t.config.IsEnabled() {
		return nil
	}

	if err := setupPrometheusTelemetry(); err != nil {
		return err
	}

	t.prometheusServer = &http.Server{
		Addr: t.config.PrometheusAddr,
		Handler: promhttp.InstrumentMetricHandler(
			prometheus.DefaultRegisterer, promhttp.HandlerFor(
				prometheus.DefaultGatherer,
				promhttp.HandlerOpts{},
			),
		),
		ReadHeaderTimeout: 60 * time.Second,
	}

	go t.startPrometheus()

	return nil
}

func (t *Telemetry) Close(ctx context.Context) error {
	if t.prometheusServer == nil {
		return nil
	}

	t.logger.Info("Prometheus server stopping", "addr", t.prometheusServer.Addr)

	return t.prometheusServer.Shutdown(ctx)
}

func (t *Telemetry) startPrometheus() {
	t.logger.Info("Prometheus server started", "addr", t.config.PrometheusAddr)

	if err := t.prometheusServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		t.logger.Error("Prometheus server ListenAndServe error", "err", err)
	}
}

func setupPrometheusTelemetry() error {
	inm := metrics.NewInmemSink(10*time.Second, time.Minute)
	metrics.DefaultInmemSignal(inm)

	promSink, err := prometheusmetrics.NewPrometheusSinkFrom(prometheusmetrics.PrometheusOpts{
		Name:       "cardano_api_prometheus_sink",
		Expiration: 0,
	})
	if err != nil {
		return err
	}

	metricsConf := metrics.DefaultConfig(serviceName)
	metricsConf.EnableHostname = false
	_, err = metrics.NewGlobal(metricsConf, metrics.FanoutSink{
		inm, promSink,
	})

	return err
}
